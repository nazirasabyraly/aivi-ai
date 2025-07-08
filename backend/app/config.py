# backend/app/config.py

import os
import secrets
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
# Azure OpenAI credentials
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

# Fallback to regular OpenAI if Azure is not configured
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Frontend URL
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Backend settings
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8001"))


# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 часа вместо 30 минут

# File upload settings
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.avi'}

# Check Azure OpenAI configuration
if AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT_NAME:
    print("✅ Azure OpenAI настроен")
elif OPENAI_API_KEY:
    print("✅ OpenAI API настроен")
else:
    print("⚠️  Ни Azure OpenAI, ни OpenAI API не настроены в .env файле")

# Database
DATABASE_URL = os.getenv("DATABASE_URL")

# OAuth Configuration
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8001")
# На продакшн сервере установите: BACKEND_BASE_URL=https://aivi-ai.it.com/api

# Clerk Configuration
CLERK_PUBLIC_KEY = os.getenv("CLERK_PUBLIC_KEY")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

# Проверяем настройки Clerk
if CLERK_PUBLIC_KEY and CLERK_SECRET_KEY:
    print("✅ Clerk настроен")
else:
    print("⚠️  Clerk не настроен (CLERK_PUBLIC_KEY или CLERK_SECRET_KEY отсутствуют)")
