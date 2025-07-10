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
    if auth_service.clerk_service.is_configured():
        try:
            payload = auth_service.clerk_service.verify_token(token)
            if payload:
                user_info = auth_service.clerk_service.extract_user_info(payload)
                clerk_id = user_info.get("clerk_id")
                
                if clerk_id:
                    # Ищем пользователя по Clerk ID
                    user = auth_service.get_user_by_clerk_id(db, clerk_id)
                    
                    if user:
                        return user
                    
                    # Если пользователь не найден, создаем его
                    if user_info.get("email"):
                        user = auth_service.create_or_update_clerk_user(
                            db=db,
                            clerk_id=clerk_id,
                            email=user_info["email"],
                            name=user_info.get("name"),
                            username=user_info.get("username"),
                            avatar_url=user_info.get("picture"),
                            email_verified=user_info.get("email_verified", False)
                        )
                        return user
        except HTTPException:
            # Clerk токен невалидный, продолжаем
            pass
    
    # Если ни один метод не сработал
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Недействительный токен",
        headers={"WWW-Authenticate": "Bearer"},
    ) 