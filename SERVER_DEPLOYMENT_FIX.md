# 🚀 Исправление проблем на сервере

## Проблемы, которые мы исправляем:

1. **После входа перекидывает на лэндинг** вместо dashboard
2. **Ошибки JWKS** в логах backend (Connection reset by peer)
3. **401 Unauthorized** для API endpoints
4. **Старый код** все еще работает в Docker контейнерах

## 🔧 Пошаговое исправление:

### 1. Подключитесь к серверу
```bash
ssh your-server
cd /path/to/your/project
```

### 2. Проверьте текущее состояние
```bash
./debug_server.sh
```

### 3. Проверьте переменные окружения
```bash
./check_env.sh
```

### 4. Убедитесь, что .env файл правильный
```bash
# Проверьте, что есть ВСЕ эти переменные:
cat .env
```

**Обязательные переменные для продакшена:**
```bash
# Clerk (ОБЯЗАТЕЛЬНО LIVE ключи!)
CLERK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx

# URLs (ОБЯЗАТЕЛЬНО HTTPS!)
FRONTEND_URL=https://aivi-ai.it.com
BACKEND_BASE_URL=https://aivi-ai.it.com/api

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Other
SECRET_KEY=your-secret-key-here
SESSION_SECRET_KEY=your-session-secret-key
```

### 5. Исправьте проблемы автоматически
```bash
./fix_server.sh
```

### 6. Проверьте логи
```bash
# Проверьте логи backend
docker logs -f $(docker ps -q --filter "name=backend")

# Должны увидеть:
# ✅ Clerk настроен
# 🔍 Decoded Clerk instance: sure-bear-37.clerk.accounts.dev
# ✅ JWKS URL works!
```

## 🔧 Clerk Dashboard настройки

### 1. Перейдите в Clerk Dashboard
- Откройте https://dashboard.clerk.com/
- Выберите ваше приложение

### 2. Настройте домены
**Settings → Domains:**
```
✅ Добавить: https://aivi-ai.it.com
✅ Убрать: localhost домены (для продакшена)
```

### 3. Настройте Redirect URLs
**Settings → Paths:**
```
✅ Sign-in URL: /login
✅ Sign-up URL: /login
✅ After sign-in: /dashboard
✅ After sign-up: /dashboard
```

### 4. Проверьте OAuth провайдеры
**User & Authentication → SSO Connections:**
```
✅ Google OAuth должен быть включен
✅ Email должен быть включен
```

## 🐳 Docker исправления

### Если контейнеры не обновляются:
```bash
# Полная очистка
docker-compose down -v --remove-orphans
docker system prune -a -f

# Пересборка без кеша
docker-compose build --no-cache

# Запуск
docker-compose up -d
```

### Проверка переменных в контейнерах:
```bash
# Backend
docker exec $(docker ps -q --filter "name=backend") env | grep CLERK

# Frontend
docker exec $(docker ps -q --filter "name=frontend") env | grep VITE
```

## 🧪 Тестирование

### 1. Проверьте API
```bash
curl https://aivi-ai.it.com/api/health
# Должен вернуть: {"status":"ok","message":"VibeMatch API is running"}

curl https://aivi-ai.it.com/api/auth/oauth-debug
# Должен показать правильные Clerk настройки
```

### 2. Проверьте frontend
- Откройте https://aivi-ai.it.com
- Нажмите "Попробовать бесплатно"
- Войдите через Google или Email
- Должно перенаправить на /dashboard

### 3. Проверьте консоль браузера
- Откройте F12 → Console
- Не должно быть ошибок 401 Unauthorized
- Должно быть: "✅ User authenticated, redirecting to dashboard"

## ⚠️ Частые ошибки

### 1. Используются TEST ключи вместо LIVE
```bash
# Неправильно:
CLERK_PUBLIC_KEY=pk_test_xxxxx

# Правильно:
CLERK_PUBLIC_KEY=pk_live_xxxxx
```

### 2. Домен не добавлен в Clerk
```
Error: Invalid publishable key domain
```
**Решение:** Добавить https://aivi-ai.it.com в Clerk Dashboard

### 3. Старые переменные в Docker
```bash
# Проверьте что переменные обновились:
docker exec backend env | grep CLERK_PUBLIC_KEY
```

### 4. CORS ошибки
```bash
# Проверьте в backend/app/main.py:
allow_origins=["https://aivi-ai.it.com"]
```

## 📋 Checklist после исправления

- [ ] ✅ API отвечает на /health
- [ ] ✅ Clerk ключи LIVE (pk_live_, sk_live_)
- [ ] ✅ Домен добавлен в Clerk Dashboard
- [ ] ✅ После входа перенаправляет на /dashboard
- [ ] ✅ Нет ошибок 401 в консоли
- [ ] ✅ Нет ошибок JWKS в логах backend
- [ ] ✅ Профиль и избранное работают
- [ ] ✅ Аудиоплееры работают

## 🆘 Если ничего не помогает

### 1. Полная переустановка
```bash
# Остановить все
docker-compose down -v --remove-orphans

# Удалить все образы
docker system prune -a -f

# Пересоздать .env файл
cp .env.example .env
# Отредактировать с правильными ключами

# Запустить заново
docker-compose up --build -d
```

### 2. Проверьте логи
```bash
# Все логи
docker-compose logs -f

# Только ошибки
docker-compose logs -f | grep -i error
```

### 3. Отладка Clerk
```bash
# Проверьте в браузере:
https://aivi-ai.it.com/api/auth/oauth-debug

# Должно показать:
{
  "google_client_id": "SET",
  "clerk_public_key": "pk_live_...",
  "frontend_url": "https://aivi-ai.it.com"
}
```

## 📞 Поддержка

Если проблемы остаются, проверьте:
1. Логи backend: `docker logs backend-container`
2. Консоль браузера: F12 → Console
3. Network tab: F12 → Network (для 401 ошибок)
4. Clerk Dashboard: все настройки правильные

---

**После всех исправлений сайт должен работать как на localhost! 🎉** 