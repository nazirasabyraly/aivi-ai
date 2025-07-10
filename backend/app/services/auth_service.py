import bcrypt
from datetime import datetime, timedelta, date
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..models.user import User
from ..database import get_db
from ..config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from .email_service import EmailService
from .clerk_service import ClerkService

# Настройка хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self):
        self.pwd_context = pwd_context
        self.email_service = EmailService()
        self.clerk_service = ClerkService()
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Проверяет пароль"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Хеширует пароль"""
        return self.pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Создает JWT токен"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[str]:
        """Проверяет JWT токен"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                return None
            return username
        except JWTError:
            return None
    
    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        """Аутентифицирует пользователя"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        
        # For Google OAuth users, password authentication is not allowed
        if user.provider == "google":
            return None
            
        if not user.hashed_password or not self.verify_password(password, user.hashed_password):
            return None
        return user
    
    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Получает пользователя по email"""
        return db.query(User).filter(User.email == email).first()
    
    def get_user_by_username(self, db: Session, username: str) -> Optional[User]:
        """Получает пользователя по username"""
        return db.query(User).filter(User.username == username).first()
    
    def get_user_by_google_id(self, db: Session, google_id: str) -> Optional[User]:
        """Получает пользователя по Google ID"""
        return db.query(User).filter(User.google_id == google_id).first()
    
    def get_user_by_clerk_id(self, db: Session, clerk_id: str) -> Optional[User]:
        """Получает пользователя по Clerk ID"""
        return db.query(User).filter(User.clerk_id == clerk_id).first()
    
    def create_user(self, db: Session, email: str, username: str, password: str = None, 
                   verification_code: str = None, verification_expiry: datetime = None,
                   google_id: str = None, clerk_id: str = None, avatar_url: str = None, 
                   name: str = None, provider: str = "email") -> User:
        """Создает нового пользователя"""
        hashed_password = None
        if password:
            hashed_password = self.get_password_hash(password)
            
        db_user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            verification_code=verification_code,
            verification_code_expires=verification_expiry,
            is_verified=True if provider in ["google", "clerk"] else (False if verification_code else True),
            google_id=google_id,
            clerk_id=clerk_id,
            avatar_url=avatar_url,
            name=name,
            provider=provider,
            daily_usage=0,  # Устанавливаем 0 при создании
            last_usage_date=None  # Не устанавливаем дату до первого использования
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    def create_user_with_verification(self, db: Session, email: str, username: str, password: str) -> tuple[User, str]:
        """Создает пользователя с email verification"""
        # Generate verification code
        verification_code = self.email_service.generate_verification_code()
        verification_expiry = self.email_service.get_verification_expiry()
        
        # Create user
        user = self.create_user(
            db=db,
            email=email,
            username=username,
            password=password,
            verification_code=verification_code,
            verification_expiry=verification_expiry
        )
        
        # Send verification email
        self.email_service.send_verification_email(email, verification_code)
        
        return user, verification_code
    
    def verify_email_code(self, db: Session, email: str, code: str) -> bool:
        """Проверяет код подтверждения email"""
        user = self.get_user_by_email(db, email)
        if not user:
            return False
            
        # Check if code matches and hasn't expired
        if (user.verification_code == code and 
            user.verification_code_expires and 
            user.verification_code_expires > datetime.utcnow()):
            
            # Mark user as verified
            user.is_verified = True
            user.verification_code = None
            user.verification_code_expires = None
            db.commit()
            return True
        
        return False
    
    def resend_verification_code(self, db: Session, email: str) -> bool:
        """Повторно отправляет код подтверждения"""
        user = self.get_user_by_email(db, email)
        if not user or user.is_verified:
            return False
        
        # Generate new verification code
        verification_code = self.email_service.generate_verification_code()
        verification_expiry = self.email_service.get_verification_expiry()
        
        # Update user
        user.verification_code = verification_code
        user.verification_code_expires = verification_expiry
        db.commit()
        
        # Send verification email
        self.email_service.send_verification_email(email, verification_code)
        
        return True
    
    def create_or_update_google_user(self, db: Session, google_id: str, email: str, 
                                   name: str, avatar_url: str = None) -> User:
        """Создает или обновляет пользователя Google OAuth"""
        # Check if user already exists by Google ID
        user = self.get_user_by_google_id(db, google_id)
        
        if user:
            # Update existing user
            user.email = email
            user.name = name
            user.avatar_url = avatar_url
            db.commit()
            db.refresh(user)
            return user
        
        # Check if user exists by email (from regular registration)
        user = self.get_user_by_email(db, email)
        if user:
            # Link existing email account to Google
            user.google_id = google_id
            user.avatar_url = avatar_url
            user.provider = "google"
            user.is_verified = True  # Google accounts are pre-verified
            if name:
                user.name = name
            db.commit()
            db.refresh(user)
            return user
        
        # Create new Google user
        # Generate unique username from email
        username = email.split('@')[0]
        counter = 1
        original_username = username
        while self.get_user_by_username(db, username):
            username = f"{original_username}{counter}"
            counter += 1
        
        user = self.create_user(
            db=db,
            email=email,
            username=username,
            google_id=google_id,
            avatar_url=avatar_url,
            name=name,
            provider="google"
        )
        
        return user
    
    def create_or_update_clerk_user(self, db: Session, clerk_id: str, email: str, 
                                   name: str = None, username: str = None, 
                                   avatar_url: str = None, email_verified: bool = False) -> User:
        """Создает или обновляет пользователя Clerk"""
        # Проверяем, существует ли пользователь с таким Clerk ID
        user = self.get_user_by_clerk_id(db, clerk_id)
        
        if user:
            # Обновляем существующего пользователя
            user.email = email
            user.name = name
            user.avatar_url = avatar_url
            user.is_verified = email_verified
            if username:
                user.username = username
            db.commit()
            db.refresh(user)
            return user
        
        # Проверяем, существует ли пользователь с таким email
        user = self.get_user_by_email(db, email)
        if user:
            # Связываем существующий аккаунт с Clerk
            user.clerk_id = clerk_id
            user.avatar_url = avatar_url
            user.provider = "clerk"
            user.is_verified = email_verified
            if name:
                user.name = name
            db.commit()
            db.refresh(user)
            return user
        
        # Создаем нового пользователя Clerk
        # Генерируем уникальное имя пользователя
        if not username:
            username = email.split('@')[0]
        
        counter = 1
        original_username = username
        while self.get_user_by_username(db, username):
            username = f"{original_username}{counter}"
            counter += 1
        
        user = self.create_user(
            db=db,
            email=email,
            username=username,
            clerk_id=clerk_id,
            avatar_url=avatar_url,
            name=name,
            provider="clerk"
        )
        
        return user
    
    def reset_daily_limits_if_needed(self, db: Session, user: User) -> None:
        """Сбрасывает дневные лимиты, если наступил новый день"""
        from datetime import date, datetime
        
        today = date.today()
        
        # Если last_usage_date не установлена или это новый день
        if not user.last_usage_date or user.last_usage_date.date() != today:
            user.daily_usage = 0
            user.last_usage_date = datetime.utcnow()
            db.commit()
            print(f"🔄 Сброшены лимиты для пользователя {user.username}: daily_usage=0, новая дата={today}")
    
    def get_remaining_analyses(self, db: Session, user: User) -> int:
        """Возвращает количество оставшихся анализов для пользователя"""
        # PRO пользователи имеют безлимитный доступ
        if user.account_type == "pro":
            return -1  # Безлимитный
        
        # Сбрасываем лимиты если нужно
        self.reset_daily_limits_if_needed(db, user)
        
        # Возвращаем оставшиеся анализы
        return max(0, 3 - user.daily_usage)
    
    def check_usage_limit(self, db: Session, user: User) -> bool:
        """Проверяет и обновляет лимит использования для пользователя"""
        # PRO пользователи имеют безлимитный доступ
        if user.account_type == "pro":
            return True
        
        # Сбрасываем лимиты если нужно
        self.reset_daily_limits_if_needed(db, user)
        
        # Проверяем лимит ПЕРЕД увеличением счетчика
        if user.daily_usage >= 3:
            raise HTTPException(
                status_code=429, 
                detail={
                    "message": "Достигнут дневной лимит анализов (3/день). Перейдите на PRO-аккаунт для безлимитного доступа.",
                    "daily_usage": user.daily_usage,
                    "limit": 3,
                    "account_type": user.account_type
                }
            )
        
        # Увеличиваем счетчик использования
        user.daily_usage += 1
        db.commit()
        db.refresh(user)
        
        print(f"✅ Анализ разрешен для пользователя {user.username}: {user.daily_usage}/3")
        return True 