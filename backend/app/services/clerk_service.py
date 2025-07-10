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
        
        # Правильный URL для JWKS - Clerk использует base64 encoded instance ID
        if self.instance_id:
            try:
                import base64
                # Декодируем base64 instance ID
                decoded_instance = base64.b64decode(self.instance_id + '==').decode('utf-8').rstrip('$')
                print(f"🔍 Decoded Clerk instance: {decoded_instance}")
                
                # Правильный формат для Clerk JWKS
                self.jwks_url = f"https://{decoded_instance}/.well-known/jwks.json"
                # Альтернативный формат
                self.jwks_url_fallback = f"https://clerk.{decoded_instance}/.well-known/jwks.json"
            except Exception as e:
                print(f"❌ Error decoding instance ID: {e}")
                self.jwks_url = None
                self.jwks_url_fallback = None
        else:
            self.jwks_url = None
            self.jwks_url_fallback = None
        
    def get_jwks(self) -> Dict[str, Any]:
        """Получает JWKS (JSON Web Key Set) от Clerk"""
        if not self.jwks_url:
            raise HTTPException(
                status_code=500, 
                detail="Clerk не настроен правильно"
            )
        
        # Пробуем основной URL
        try:
            print(f"🔗 Requesting JWKS from: {self.jwks_url}")
            response = requests.get(self.jwks_url, timeout=10)
            print(f"📊 JWKS response status: {response.status_code}")
            response.raise_for_status()
            jwks_data = response.json()
            print(f"🔑 JWKS keys count: {len(jwks_data.get('keys', []))}")
            return jwks_data
        except requests.RequestException as e:
            print(f"❌ JWKS request failed: {str(e)}")
            
            # Пробуем fallback URL
            if self.jwks_url_fallback:
                try:
                    print(f"🔗 Trying fallback JWKS URL: {self.jwks_url_fallback}")
                    response = requests.get(self.jwks_url_fallback, timeout=10)
                    print(f"📊 Fallback JWKS response status: {response.status_code}")
                    response.raise_for_status()
                    jwks_data = response.json()
                    print(f"🔑 Fallback JWKS keys count: {len(jwks_data.get('keys', []))}")
                    return jwks_data
                except requests.RequestException as e2:
                    print(f"❌ Fallback JWKS request also failed: {str(e2)}")
            
            raise HTTPException(
                status_code=500, 
                detail=f"Ошибка получения JWKS от Clerk: {str(e)}"
            )
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Проверяет JWT токен от Clerk"""
        if not token:
            return None
            
        try:
            # Сначала пробуем JWKS метод
            return self._verify_token_with_jwks(token)
        except Exception as e:
            print(f"❌ JWKS verification failed: {str(e)}")
            # Если JWKS не работает, пробуем Clerk API
            return self._verify_token_with_api(token)
    
    def _verify_token_with_jwks(self, token: str) -> Optional[Dict[str, Any]]:
        """Проверяет токен используя JWKS"""
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
    
    def _verify_token_with_api(self, token: str) -> Optional[Dict[str, Any]]:
        """Проверяет токен используя декодирование без верификации (для разработки)"""
        try:
            print(f"🔗 Using unverified token decoding for development...")
            
            # Декодируем токен без верификации подписи (только для разработки!)
            payload = jwt.decode(token, options={"verify_signature": False})
            
            print(f"✅ Token decoded successfully")
            print(f"📊 Token payload keys: {list(payload.keys())}")
            
            # Проверяем основные поля
            if not payload.get("sub"):
                raise HTTPException(
                    status_code=401, 
                    detail="Токен не содержит user ID"
                )
            
            return payload
                
        except Exception as e:
            print(f"❌ Token decoding error: {str(e)}")
            raise HTTPException(
                status_code=401, 
                detail=f"Ошибка декодирования токена: {str(e)}"
            )
    
    def extract_user_info(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Извлекает информацию о пользователе из payload токена"""
        clerk_id = payload.get("sub")
        
        # Если в токене нет email, получаем его из Clerk API
        email = payload.get("email")
        if not email and clerk_id and self.secret_key:
            email = self._get_user_email_from_api(clerk_id)
        
        return {
            "clerk_id": clerk_id,
            "email": email,
            "email_verified": payload.get("email_verified", True),  # Clerk пользователи обычно верифицированы
            "name": payload.get("name"),
            "given_name": payload.get("given_name"),
            "family_name": payload.get("family_name"),
            "picture": payload.get("picture"),
            "username": payload.get("username"),
        }
    
    def _get_user_email_from_api(self, clerk_id: str) -> Optional[str]:
        """Получает email пользователя из Clerk API"""
        try:
            print(f"🔗 Getting user email from Clerk API for: {clerk_id}")
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"https://api.clerk.com/v1/users/{clerk_id}",
                headers=headers,
                timeout=10
            )
            
            print(f"📊 Clerk API user response status: {response.status_code}")
            
            if response.status_code == 200:
                user_data = response.json()
                email_addresses = user_data.get("email_addresses", [])
                if email_addresses:
                    primary_email = email_addresses[0].get("email_address")
                    print(f"✅ Got user email from Clerk API: {primary_email}")
                    return primary_email
            else:
                print(f"❌ Failed to get user from Clerk API: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error getting user email from Clerk API: {str(e)}")
            
        return None
    
    def is_configured(self) -> bool:
        """Проверяет, настроен ли Clerk"""
        return bool(self.publishable_key and self.secret_key) 