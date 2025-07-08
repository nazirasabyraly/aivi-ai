from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
from ..database import get_db
from ..models.user import User
from ..schemas import (UserCreate, UserLogin, Token, User as UserSchema, 
                      EmailVerification, ResendVerification, VerificationRequired,
                      GoogleAuthRequest, UserProfileUpdate)
from ..services.auth_service import AuthService

router = APIRouter(tags=["users"])
security = HTTPBearer()
auth_service = AuthService()

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Регистрация нового пользователя с email verification"""
    # Проверяем, существует ли пользователь с таким email
    if auth_service.get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )
    
    # Проверяем, существует ли пользователь с таким username
    if auth_service.get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем уже существует"
        )
    
    # Создаем нового пользователя с verification
    user, verification_code = auth_service.create_user_with_verification(
        db, user_data.email, user_data.username, user_data.password
    )
    
    # Возвращаем информацию о необходимости верификации
    raise HTTPException(
        status_code=status.HTTP_201_CREATED,
        detail={
            "message": "Пользователь создан. Проверьте email для подтверждения аккаунта.",
            "requires_verification": True,
            "email": user.email
        }
    )

@router.post("/verify-email", response_model=Token)
async def verify_email(verification_data: EmailVerification, db: Session = Depends(get_db)):
    """Подтверждение email адреса"""
    if not auth_service.verify_email_code(db, verification_data.email, verification_data.verification_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный или истекший код подтверждения"
        )
    
    # Get verified user
    user = auth_service.get_user_by_email(db, verification_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Create access token
    access_token = auth_service.create_access_token(data={"sub": user.username})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserSchema.from_orm(user)
    )

@router.post("/resend-verification")
async def resend_verification_code(resend_data: ResendVerification, db: Session = Depends(get_db)):
    """Повторная отправка кода подтверждения"""
    if not auth_service.resend_verification_code(db, resend_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь не найден или уже подтвержден"
        )
    
    return {"message": "Код подтверждения отправлен повторно"}

@router.post("/google-auth", response_model=Token)
async def google_auth(auth_data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Авторизация через Google OAuth"""
    try:
        # Verify Google ID token
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth не настроен"
            )
        
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            auth_data.token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Get user info from Google
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        avatar_url = idinfo.get('picture', '')
        
        # Create or update user
        user = auth_service.create_or_update_google_user(
            db=db,
            google_id=google_id,
            email=email,
            name=name,
            avatar_url=avatar_url
        )
        
        # Create access token
        access_token = auth_service.create_access_token(data={"sub": user.username})
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserSchema.from_orm(user)
        )
        
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный Google токен"
        )
    except Exception as e:
        print(f"Google OAuth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка авторизации через Google"
        )

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Вход пользователя"""
    user = auth_service.authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is verified
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": "Email не подтвержден. Проверьте почту или запросите новый код.",
                "requires_verification": True,
                "email": user.email
            }
        )
    
    # Создаем токен доступа
    access_token = auth_service.create_access_token(data={"sub": user.username})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserSchema.from_orm(user)
    )

@router.get("/me")
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Получение информации о текущем пользователе с данными профиля"""
    username = auth_service.verify_token(credentials.credentials)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = auth_service.get_user_by_username(db, username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Подсчитываем оставшиеся анализы
    remaining_analyses = 0
    if user.account_type == "pro":
        remaining_analyses = -1  # Безлимитный
    else:
        from datetime import date
        today = date.today()
        if not user.last_usage_date or user.last_usage_date.date() != today:
            remaining_analyses = 3  # Новый день - полный лимит
        else:
            remaining_analyses = max(0, 3 - user.daily_usage)
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "account_type": user.account_type,
        "daily_usage": user.daily_usage,
        "remaining_analyses": remaining_analyses,
        "is_verified": user.is_verified,
        "provider": user.provider,
        "created_at": user.created_at
    }

@router.put("/update-profile")
async def update_profile(
    profile_data: UserProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Обновление профиля пользователя"""
    username = auth_service.verify_token(credentials.credentials)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = auth_service.get_user_by_username(db, username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Обновляем данные пользователя
    if profile_data.name is not None:
        user.name = profile_data.name.strip()
    
    if profile_data.username is not None:
        # Проверяем, что новый username уникален
        existing_user = auth_service.get_user_by_username(db, profile_data.username.strip())
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким именем уже существует"
            )
        user.username = profile_data.username.strip()
    
    db.commit()
    db.refresh(user)
    
    # Подсчитываем оставшиеся анализы
    remaining_analyses = 0
    if user.account_type == "pro":
        remaining_analyses = -1  # Безлимитный
    else:
        from datetime import date
        today = date.today()
        if not user.last_usage_date or user.last_usage_date.date() != today:
            remaining_analyses = 3  # Новый день - полный лимит
        else:
            remaining_analyses = max(0, 3 - user.daily_usage)
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "account_type": user.account_type,
        "daily_usage": user.daily_usage,
        "remaining_analyses": remaining_analyses,
        "is_verified": user.is_verified,
        "provider": user.provider,
        "created_at": user.created_at
    }

def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Зависимость для получения текущего пользователя"""
    username = auth_service.verify_token(credentials.credentials)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = auth_service.get_user_by_username(db, username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user 
