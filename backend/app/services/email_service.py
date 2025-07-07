import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from pprint import pprint
import os
import random
import string
from datetime import datetime, timedelta

class EmailService:
    def __init__(self):
        # Brevo API configuration
        self.configuration = sib_api_v3_sdk.Configuration()
        self.configuration.api_key['api-key'] = os.environ.get("SMTP_API_KEY")  # Ваш ключ в SMTP_API_KEY
        
        # Email settings
        self.from_email = os.getenv("FROM_EMAIL", "noreply@aivi-ai.it.com")
        self.from_name = os.getenv("FROM_NAME", "Aivi Music")
        
        print(f"🔑 Email Service initialized with key: {self.configuration.api_key['api-key'][:15]}..." if self.configuration.api_key['api-key'] else "❌ No API key found")
    
    def generate_verification_code(self, length=6):
        """Генерирует случайный код подтверждения"""
        return ''.join(random.choices(string.digits, k=length))
    
    def send_verification_email(self, to_email: str, verification_code: str):
        """Отправляет email с кодом подтверждения через Brevo API"""
        if not self.configuration.api_key['api-key']:
            return self._fallback_console_mode(to_email, verification_code)
        
        try:
            api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(self.configuration))
            
            subject = "Подтверждение регистрации - Aivi Music"
            html_content = self._get_html_content(verification_code)
            sender = {"name": self.from_name, "email": self.from_email}
            to = [{"email": to_email}]
            
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=to,
                html_content=html_content,
                sender=sender,
                subject=subject
            )

            print(f"📧 Sending email to {to_email} with code {verification_code}")
            api_response = api_instance.send_transac_email(send_smtp_email)
            
            print("✅ Email sent successfully via Brevo API!")
            print(f"🔑 Verification Code: {verification_code}")
            pprint(api_response)
            return True
            
        except ApiException as e:
            print(f"❌ Exception when calling Brevo API: {e}")
            return self._fallback_console_mode(to_email, verification_code)
        except Exception as e:
            print(f"❌ Unexpected error sending email: {e}")
            return self._fallback_console_mode(to_email, verification_code)
    
    def _get_html_content(self, verification_code: str):
        """Возвращает HTML содержимое email"""
        return f"""
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
    
    def _fallback_console_mode(self, to_email: str, verification_code: str):
        """Fallback режим - вывод в консоль"""
        print(f"")
        print(f"=== 📧 EMAIL VERIFICATION (CONSOLE MODE) ===")
        print(f"📩 To: {to_email}")
        print(f"🔑 Verification Code: {verification_code}")
        print(f"⏰ Expires in 15 minutes")
        print(f"ℹ️  Check your SMTP_API_KEY in .env file")
        print(f"=========================================")
        print(f"")
        return True
    
    def get_verification_expiry(self):
        """Возвращает время истечения кода (15 минут от текущего времени)"""
        return datetime.utcnow() + timedelta(minutes=15) 
