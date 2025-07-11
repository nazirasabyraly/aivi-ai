import traceback
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models.user import User
from .services.auth_service import AuthService

auth_service = AuthService()
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    
    # Сначала пробуем проверить как собственный JWT токен
    username = auth_service.verify_token(token)
    if username:
        user = auth_service.get_user_by_username(db, username)
        if user:
            return user
    
    # Если не получилось, пробуем как Clerk токен
    print(f"🔍 Trying Clerk token verification...")
    if auth_service.clerk_service.is_configured():
        try:
            print(f"✅ ClerkService is configured")
            print(f"🔑 Clerk public key: {auth_service.clerk_service.publishable_key[:30]}...")
            print(f"🔗 JWKS URL: {auth_service.clerk_service.jwks_url}")
            
            print(f"🎯 Verifying Clerk token: {token[:20]}...")
            payload = auth_service.clerk_service.verify_token(token)
            print(f"📦 Clerk token payload: {payload}")

            if not payload:
                 raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Clerk token payload")

            user_info = auth_service.clerk_service.extract_user_info(payload)
            clerk_id = user_info.get("clerk_id")
            
            if not clerk_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Clerk ID not found in token")

            # Ищем пользователя или создаем нового
            user = auth_service.get_user_by_clerk_id(db, clerk_id)
            
            if not user:
                print(f"🧐 User with Clerk ID {clerk_id} not found in DB. Trying to find by email or create.")
                # Пробуем найти по email, чтобы связать аккаунты
                email = user_info.get("email")
                if email:
                    user = auth_service.get_user_by_email(db, email)
                    if user:
                        print(f"🤝 Found user by email {email}. Linking to Clerk ID {clerk_id}.")
                        user.clerk_id = clerk_id
                        user.provider = "clerk"
                        db.commit()
                        return user

                # Если не нашли ни по clerk_id, ни по email - создаем нового
                print(f"➕ Creating new user for Clerk ID {clerk_id} and email {email}")
                user = auth_service.create_or_update_clerk_user(
                    db=db,
                    clerk_id=clerk_id,
                    email=user_info["email"],
                    name=user_info.get("name"),
                    username=user_info.get("username"),
                    avatar_url=user_info.get("picture"),
                    email_verified=user_info.get("email_verified", False)
                )
                print(f"✅ Created new Clerk user: {user.email}")
            
            if user:
                return user

        except HTTPException as e:
            # Перехватываем HTTP исключения и пробрасываем их дальше
            print(f"✋ HTTP exception during Clerk auth: {e.detail}")
            raise e
        except Exception as e:
            # Перехватываем ВСЕ остальные ошибки, чтобы сервер не падал
            tb_str = traceback.format_exc()
            print(f"❌ CRITICAL: Unhandled exception in get_current_user (Clerk flow):\n{tb_str}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An unexpected error occurred during authentication. Please check server logs. Error: {str(e)}"
            )
    else:
        print(f"❌ ClerkService is not configured")
    
    # Если ни один метод не сработал
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Недействительный токен",
        headers={"WWW-Authenticate": "Bearer"},
    ) 