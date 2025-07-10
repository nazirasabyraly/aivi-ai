import jwt
import requests
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from ..config import CLERK_PUBLIC_KEY, CLERK_SECRET_KEY

class ClerkService:
    def __init__(self):
        self.publishable_key = CLERK_PUBLIC_KEY
        self.secret_key = CLERK_SECRET_KEY
        
        # Извлекаем instance ID из publishable key
        if self.publishable_key:
            # Формат: pk_test_xxx или pk_live_xxx
            parts = self.publishable_key.split('_')
            if len(parts) >= 3:
                self.instance_id = parts[2]
            else:
                self.instance_id = None
        else:
            self.instance_id = None
        
        self.jwks_url = f"https://api.clerk.com/v1/jwks" if self.instance_id else None
        
    def get_jwks(self) -> Dict[str, Any]:
        """Получает JWKS (JSON Web Key Set) от Clerk"""
        if not self.jwks_url:
            raise HTTPException(
                status_code=500, 
                detail="Clerk не настроен правильно"
            )
        
        try:
            response = requests.get(self.jwks_url, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Ошибка получения JWKS от Clerk: {str(e)}"
            )
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Проверяет JWT токен от Clerk"""
        if not token:
            return None
            
        try:
            # Получаем заголовок токена без верификации
            unverified_header = jwt.get_unverified_header(token)
            
            # Получаем JWKS
            jwks = self.get_jwks()
            
            # Ищем подходящий ключ
            rsa_key = None
            for key in jwks.get("keys", []):
                if key.get("kid") == unverified_header.get("kid"):
                    rsa_key = {
                        "kty": key.get("kty"),
                        "kid": key.get("kid"),
                        "use": key.get("use"),
                        "n": key.get("n"),
                        "e": key.get("e")
                    }
                    break
            
            if not rsa_key:
                raise HTTPException(
                    status_code=401, 
                    detail="Публичный ключ не найден"
                )
            
            # Создаем публичный ключ
            from jwt.algorithms import RSAAlgorithm
            public_key = RSAAlgorithm.from_jwk(rsa_key)
            
            # Верифицируем токен
            payload = jwt.decode(
                token, 
                public_key, 
                algorithms=["RS256"],
                # Для Clerk токенов audience может быть разным
                options={"verify_aud": False}
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401, 
                detail="Токен истек"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=401, 
                detail=f"Неверный токен: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Ошибка проверки токена: {str(e)}"
            )
    
    def extract_user_info(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Извлекает информацию о пользователе из payload токена"""
        return {
            "clerk_id": payload.get("sub"),
            "email": payload.get("email"),
            "email_verified": payload.get("email_verified", False),
            "name": payload.get("name"),
            "given_name": payload.get("given_name"),
            "family_name": payload.get("family_name"),
            "picture": payload.get("picture"),
            "username": payload.get("username"),
        }
    
    def is_configured(self) -> bool:
        """Проверяет, настроен ли Clerk"""
        return bool(self.publishable_key and self.secret_key) 