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
        print(f"✅ ClerkService is configured")
        print(f"🔑 Clerk public key: {auth_service.clerk_service.publishable_key[:30]}...")
        print(f"🔗 JWKS URL: {auth_service.clerk_service.jwks_url}")
        try:
            print(f"🎯 Verifying Clerk token: {token[:20]}...")
            payload = auth_service.clerk_service.verify_token(token)
            print(f"📦 Clerk token payload: {payload}")
            if payload:
                user_info = auth_service.clerk_service.extract_user_info(payload)
                clerk_id = user_info.get("clerk_id")
                
                if clerk_id:
                    # Безопасно ищем пользователя по Clerk ID
                    try:
                        user = auth_service.get_user_by_clerk_id(db, clerk_id)
                        
                        if user:
                            print(f"✅ Found existing Clerk user: {user.email}")
                            return user
                    except Exception as db_error:
                        print(f"⚠️  Database error (missing clerk_id column?): {db_error}")
                        # Если колонка clerk_id не существует, попробуем найти по email
                        email = user_info.get("email")
                        if email:
                            user = auth_service.get_user_by_email(db, email)
                            if user:
                                print(f"✅ Found user by email (fallback): {user.email}")
                                return user
                    
                    # Если пользователь не найден, создаем его автоматически
                    if user_info.get("email"):
                        print(f"📝 Creating new Clerk user: {user_info['email']}")
                        try:
                            user = auth_service.create_or_update_clerk_user(
                                db=db,
                                clerk_id=clerk_id,
                                email=user_info["email"],
                                name=user_info.get("name"),
                                username=user_info.get("username"),
                                avatar_url=user_info.get("picture"),
                                email_verified=user_info.get("email_verified", False)
                            )
                            print(f"✅ Created Clerk user in DB: {user.email} (ID: {user.id})")
                            return user
                        except Exception as create_error:
                            print(f"❌ Failed to create Clerk user: {create_error}")
                            # Если не можем создать, возвращаем 401
                            pass
        except HTTPException as e:
            # Clerk токен невалидный, продолжаем
            print(f"❌ Clerk token verification failed: {e}")
            pass
        except Exception as e:
            print(f"❌ Unexpected error in Clerk verification: {e}")
            pass
    else:
        print(f"❌ ClerkService is not configured")
    
    # Если ни один метод не сработал
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Недействительный токен",
        headers={"WWW-Authenticate": "Bearer"},
    ) 