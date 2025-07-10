from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import logging
import os

from app.config import FRONTEND_URL, BACKEND_BASE_URL   
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
        "redirect_uri": f"{BACKEND_BASE_URL}auth/google/callback",
        "base_url": str(request.base_url),
        "session_secret": "SET" if os.getenv("SESSION_SECRET_KEY") else "NOT_SET"
    }

# Google OAuth routes are now handled by Clerk
# These endpoints are deprecated and will be removed

@router.post("/clerk/webhook")
async def clerk_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook endpoint для Clerk
    Обрабатывает события создания/обновления пользователей
    """
    try:
        payload = await request.body()
        headers = dict(request.headers)
        
        # Проверяем webhook signature (в продакшене обязательно!)
        # webhook_secret = os.getenv("CLERK_WEBHOOK_SECRET")
        # if webhook_secret:
        #     ... проверка подписи ...
        
        event = await request.json()
        event_type = event.get("type")
        data = event.get("data")
        
        logger.info(f"📨 Clerk webhook event: {event_type}")
        
        if event_type in ["user.created", "user.updated"]:
            user_data = data
            clerk_id = user_data.get("id")
            email_addresses = user_data.get("email_addresses", [])
            
            if email_addresses:
                primary_email = next((email for email in email_addresses if email.get("verification", {}).get("status") == "verified"), email_addresses[0])
                email = primary_email.get("email_address")
                email_verified = primary_email.get("verification", {}).get("status") == "verified"
                
                # Создаем или обновляем пользователя
                user = auth_service.create_or_update_clerk_user(
                    db=db,
                    clerk_id=clerk_id,
                    email=email,
                    name=f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip(),
                    username=user_data.get("username"),
                    avatar_url=user_data.get("image_url"),
                    email_verified=email_verified
                )
                
                logger.info(f"✅ User {email} synced from Clerk")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"❌ Clerk webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook processing failed")
