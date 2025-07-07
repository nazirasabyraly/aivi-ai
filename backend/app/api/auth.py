from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import logging
import os

from app.config import FRONTEND_URL
from ..database import get_db
from ..models.user import User
from app.services.auth_service import AuthService
from ..dependencies import get_current_user

from authlib.integrations.starlette_client import OAuth
from authlib.integrations.base_client.errors import MismatchingStateError
from app.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

router = APIRouter(tags=["auth"])
auth_service = AuthService()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

oauth = OAuth()
oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        'prompt': 'select_account'  # Заставляем Google показывать выбор аккаунта
    },
)


@router.get("/ngrok-url")
async def get_ngrok_url(request: Request):
    """Возвращает текущий URL бэкенда для настройки фронтенда"""
    base_url = str(request.base_url).rstrip('/')
    return {"backend_url": base_url}

@router.get("/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    """
    Проверяет валидность токена
    """
    return {"valid": True, "user_id": current_user.id}

@router.get("/oauth-debug")
async def oauth_debug(request: Request):
    """Отладочный эндпоинт для проверки OAuth конфигурации"""
    return {
        "google_client_id": GOOGLE_CLIENT_ID[:20] + "..." if GOOGLE_CLIENT_ID else "NOT_SET",
        "google_client_secret": "SET" if GOOGLE_CLIENT_SECRET else "NOT_SET",
        "frontend_url": FRONTEND_URL,
        "redirect_uri": f"{request.base_url}auth/google/callback",
        "base_url": str(request.base_url),
        "session_secret": "SET" if os.getenv("SESSION_SECRET_KEY") else "NOT_SET"
    }

@router.get("/google")
async def login_via_google(request: Request):
    # Правильно строим redirect URI
    redirect_uri = f"{request.base_url}auth/google/callback"
    logger.info(f"🔗 OAuth redirect URI: {redirect_uri}")
    
    try:
        # Создаем URL для Google OAuth вручную
        from urllib.parse import urlencode
        import secrets
        
        # Создаем state для CSRF защиты
        state = secrets.token_urlsafe(32)
        request.session["oauth_state"] = state
        
        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": "openid email profile",
            "response_type": "code",
            "state": state,
            "prompt": "select_account"
        }
        
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        logger.info(f"🔗 Manual OAuth URL: {auth_url}")
        
        return RedirectResponse(auth_url)
        
    except Exception as e:
        logger.error(f"❌ OAuth authorize error: {e}")
        raise HTTPException(status_code=500, detail="OAuth authorization failed")

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    try:
        logger.info("🔄 Processing Google OAuth callback")
        logger.info(f"📋 Request URL: {request.url}")
        logger.info(f"📋 Query params: {dict(request.query_params)}")
        
        # Проверяем наличие error параметра
        if "error" in request.query_params:
            error = request.query_params["error"]
            logger.error(f"❌ OAuth error: {error}")
            return RedirectResponse(f"{FRONTEND_URL}/login?error=oauth_error")
        
        # Проверяем наличие кода авторизации
        if "code" not in request.query_params:
            logger.error("❌ No authorization code in callback")
            return RedirectResponse(f"{FRONTEND_URL}/login?error=no_code")
        
        # Проверяем state для CSRF защиты
        received_state = request.query_params.get("state")
        session_state = request.session.get("oauth_state")
        
        if not received_state or received_state != session_state:
            logger.error(f"❌ State mismatch: received={received_state}, session={session_state}")
            return RedirectResponse(f"{FRONTEND_URL}/login?error=csrf_error")
        
        # Очищаем state из сессии
        request.session.pop("oauth_state", None)
        
        # Получаем токен напрямую от Google
        import httpx
        from urllib.parse import urlencode
        
        token_data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": request.query_params["code"],
            "grant_type": "authorization_code",
            "redirect_uri": f"{request.base_url}auth/google/callback"
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if token_response.status_code != 200:
                logger.error(f"❌ Token request failed: {token_response.text}")
                return RedirectResponse(f"{FRONTEND_URL}/login?error=token_failed")
            
            token_json = token_response.json()
            access_token = token_json.get("access_token")
            id_token = token_json.get("id_token")
            
            if not access_token or not id_token:
                logger.error("❌ No access token or id token received")
                return RedirectResponse(f"{FRONTEND_URL}/login?error=no_token")
            
            # Получаем информацию о пользователе
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if user_response.status_code != 200:
                logger.error(f"❌ User info request failed: {user_response.text}")
                return RedirectResponse(f"{FRONTEND_URL}/login?error=userinfo_failed")
            
            user_info = user_response.json()
            logger.info(f"👤 User info: {user_info.get('email')}")
            
            user = auth_service.create_or_update_google_user(
                db=db,
                google_id=user_info['id'],
                email=user_info['email'],
                name=user_info.get('name'),
                avatar_url=user_info.get('picture')
            )

            jwt_token = auth_service.create_access_token(data={"sub": user.username})

            # редиректим на frontend с токеном
            return RedirectResponse(f"{FRONTEND_URL}/login?token={jwt_token}")
        
    except Exception as e:
        logger.error(f"❌ OAuth callback error: {e}")
        return RedirectResponse(f"{FRONTEND_URL}/login?error=oauth_failed")
