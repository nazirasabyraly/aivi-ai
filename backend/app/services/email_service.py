import requests
import os
import random
import string
from datetime import datetime, timedelta

class EmailService:
    def __init__(self):
        # Настройки Brevo API
        self.api_key = os.getenv("BREVO_API_KEY")
        self.api_url = "https://api.brevo.com/v3/smtp/email"
        self.from_email = os.getenv("FROM_EMAIL", "aivi-web@noreply.com")
        self.from_name = os.getenv("FROM_NAME", "Aivi Music Platform")
        
    def generate_verification_code(self, length=6):
        """Генерирует случайный код подтверждения"""
        return ''.join(random.choices(string.digits, k=length))
    
    def send_verification_email(self, to_email: str, verification_code: str):
        """Отправляет email с кодом подтверждения через Brevo API"""
        try:
            if not self.api_key:
                # Fallback в dev режим если нет API ключа
                print(f"")
                print(f"=== 📧 EMAIL VERIFICATION (DEV MODE - NO BREVO API KEY) ===")
                print(f"📩 To: {to_email}")
                print(f"🔑 Verification Code: {verification_code}")
                print(f"⏰ Expires in 15 minutes")
                print(f"ℹ️  Configure BREVO_API_KEY in .env file")
                print(f"==========================================")
                print(f"")
                return True

            headers = {
                "accept": "application/json",
                "api-key": self.api_key,
                "content-type": "application/json"
            }
            
            # HTML версия письма
            html_content = f"""
            <html>
              <head></head>
              <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🎵 Aivi Music</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Ваш музыкальный AI помощник</p>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 40px 30px;">
                    <h2 style="color: #333; margin-bottom: 20px;">Добро пожаловать!</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                      Спасибо за регистрацию в Aivi Music! Для завершения создания аккаунта, пожалуйста, подтвердите свой email адрес.
                    </p>
                    
                    <!-- Verification Code -->
                    <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                      <p style="color: #666; margin-bottom: 10px; font-size: 14px;">Ваш код подтверждения:</p>
                      <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: monospace;">
                        {verification_code}
                      </div>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; line-height: 1.6;">
                      Введите этот код на странице регистрации. Код действителен в течение 15 минут.
                    </p>
                    
                    <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
                      <p style="color: #999; font-size: 12px; margin: 0;">
                        Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.
                      </p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
            """
            
            # Текстовая версия
            text_content = f"""
            Добро пожаловать в Aivi Music!
            
            Ваш код подтверждения: {verification_code}
            
            Введите этот код на странице регистрации для завершения создания аккаунта.
            Код действителен в течение 15 минут.
            
            Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.
            """
            
            payload = {
                "sender": {
                    "name": self.from_name,
                    "email": self.from_email
                },
                "to": [
                    {
                        "email": to_email
                    }
                ],
                "subject": "Подтверждение регистрации - Aivi Music",
                "htmlContent": html_content,
                "textContent": text_content
            }
            
            response = requests.post(self.api_url, json=payload, headers=headers)
            
            if response.status_code == 201:
                print(f"✅ Email sent successfully via Brevo API to {to_email}")
                print(f"📧 From: {self.from_name} <{self.from_email}>")
                print(f"🔑 Verification Code: {verification_code}")
                print(f"📨 Message ID: {response.json().get('messageId', 'N/A')}")
                return True
            else:
                print(f"❌ Failed to send email via Brevo API: {response.status_code}")
                print(f"❌ Response: {response.text}")
                # Fallback to console mode
                self._fallback_console_mode(to_email, verification_code)
                return True
                
        except Exception as e:
            print(f"❌ Error sending email via Brevo API: {e}")
            # Fallback to console mode
            self._fallback_console_mode(to_email, verification_code)
            return True
    
    def _fallback_console_mode(self, to_email: str, verification_code: str):
        """Fallback режим - вывод в консоль"""
        print(f"")
        print(f"=== 📧 EMAIL VERIFICATION (FALLBACK MODE) ===")
        print(f"📩 To: {to_email}")
        print(f"🔑 Verification Code: {verification_code}")
        print(f"⏰ Expires in 15 minutes")
        print(f"==========================================")
        print(f"")
    
    def get_verification_expiry(self):
        """Возвращает время истечения кода (15 минут от текущего времени)"""
        return datetime.utcnow() + timedelta(minutes=15) 
