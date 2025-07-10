# 🚀 Deployment Checklist для Aivi AI

## 📋 Pre-deployment проверки

### 1. Backend Environment Variables (.env)
```bash
# Обязательные переменные на сервере:
DATABASE_URL=postgresql://user:password@host:port/database
SECRET_KEY=your-secret-key-here
BACKEND_BASE_URL=https://aivi-ai.it.com/api

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Clerk
CLERK_PUBLIC_KEY=pk_live_xxxxx  # ⚠️ LIVE ключ для продакшена!
CLERK_SECRET_KEY=sk_live_xxxxx

# Email
SMTP_API_KEY=your-brevo-api-key
FROM_EMAIL=noreply@aivi-ai.it.com

# Proxy (если нужен)
PROXY_URL=http://username:password@proxy:port

# Other
SESSION_SECRET_KEY=your-session-secret
FRONTEND_URL=https://aivi-ai.it.com
```

### 2. Frontend Environment Variables (.env)
```bash
# В .env.production файле:
VITE_API_URL=https://aivi-ai.it.com/api
VITE_CLERK_PUBLIC_KEY=pk_live_xxxxx  # ⚠️ Тот же LIVE ключ!
```

## 🔧 Clerk Configuration на продакшене

### 1. В Clerk Dashboard
```
Settings → Domains:
✅ Добавить: https://aivi-ai.it.com
✅ Удалить: localhost домены (если не нужны)

Settings → Environment:
✅ Production ключи (pk_live_xxx, sk_live_xxx)
✅ Webhook URLs: https://aivi-ai.it.com/api/webhooks/clerk

Settings → Paths:
✅ Sign-in URL: /login
✅ Sign-up URL: /login
✅ After sign-in: /dashboard
✅ After sign-up: /dashboard
```

### 2. Проверка Publishable Key
```bash
# Правильный для продакшена:
pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Неправильный (dev ключ):
pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🌐 DNS и SSL проверки

### 1. Поддомены
```bash
# Проверить DNS записи:
dig aivi-ai.it.com          # Основной домен
dig api.aivi-ai.it.com      # API (если используется)

# SSL сертификаты для всех доменов
```

### 2. CORS настройки
```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://aivi-ai.it.com"],  # ⚠️ Только продакшен домен!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🐳 Docker проблемы

### 1. Build контекст
```dockerfile
# Убедиться что .env файлы НЕ в .dockerignore
# И правильно копируются в контейнер

# frontend/Dockerfile
COPY .env.production .env
```

### 2. Порты и сети
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    ports:
      - "80:80"  # ⚠️ Nginx должен слушать 80/443
    environment:
      - VITE_API_URL=https://aivi-ai.it.com/api
      
  backend:
    ports:
      - "8001:8001"
    environment:
      - BACKEND_BASE_URL=https://aivi-ai.it.com/api
```

## ⚠️ Частые ошибки при деплое

### 1. **CORS ошибки**
```
Access to fetch at 'https://aivi-ai.it.com/api' from origin 'https://aivi-ai.it.com' has been blocked by CORS policy
```
**Решение:** Проверить allow_origins в FastAPI

### 2. **Clerk домены**
```
Clerk: Invalid publishable key domain
```
**Решение:** Добавить домен в Clerk Dashboard

### 3. **SSL проблемы**
```
Mixed Content: The page was loaded over HTTPS, but requested an insecure resource
```
**Решение:** Все API вызовы должны быть через HTTPS

### 4. **Environment Variables**
```
KeyError: 'CLERK_PUBLIC_KEY'
```
**Решение:** Проверить все переменные на сервере

## 🧪 Post-deployment тестирование

### 1. Основные функции
```bash
# Проверить:
✅ Главная страница загружается
✅ Google OAuth работает
✅ Clerk регистрация работает
✅ API endpoints отвечают
✅ SSL сертификаты валидны
✅ Все статические файлы загружаются
```

### 2. Проверка логов
```bash
# Backend логи
docker logs backend-container

# Frontend логи (в браузере)
F12 → Console → проверить ошибки

# Nginx логи
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🔒 Безопасность

### 1. Секретные ключи
```bash
# Сгенерировать новые для продакшена:
openssl rand -hex 32  # SECRET_KEY
openssl rand -hex 32  # SESSION_SECRET_KEY
```

### 2. Database
```bash
# Проверить подключение:
psql $DATABASE_URL -c "SELECT 1;"

# Запустить миграции:
alembic upgrade head
```

### 3. Rate Limiting
```python
# Добавить в FastAPI для продакшена
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)
```

## 📈 Мониторинг

### 1. Health Checks
```python
# backend/app/api/health.py
@router.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}
```

### 2. Логирование
```python
# Настроить structured logging для продакшена
import structlog
```

## 🚀 Deployment команды

### 1. Backend
```bash
cd backend
docker build -t aivi-backend .
docker run -d --name aivi-backend -p 8001:8001 aivi-backend
```

### 2. Frontend
```bash
cd frontend
npm run build
# Скопировать dist/ в nginx
```

### 3. Database
```bash
# Миграции
docker exec aivi-backend alembic upgrade head

# Проверка данных
docker exec aivi-backend python -c "from app.database import engine; print(engine.execute('SELECT 1').scalar())"
``` 