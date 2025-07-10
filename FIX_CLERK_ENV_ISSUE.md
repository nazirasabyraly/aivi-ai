# 🔧 Исправление проблемы с VITE_CLERK_PUBLIC_KEY

## Проблема
Frontend выдает ошибку:
```
VITE_CLERK_PUBLIC_KEY не найден в переменных окружения
Uncaught Error: @clerk/clerk-react: Missing publishableKey
```

## Причина
1. **Основная проблема ИСПРАВЛЕНА**: В `backend/app/main.py` добавлен префикс `/api` ко всем роутерам
2. **Новая проблема**: Переменная `VITE_CLERK_PUBLIC_KEY` не передается в Docker контейнер frontend

## Исправления, которые уже сделаны ✅

### 1. Исправлен main.py (основная проблема)
```python
# Было:
app.include_router(users.router, prefix="/users")

# Стало:
app.include_router(users.router, prefix="/api/users")
```

### 2. Исправлен docker-compose.yml
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:  # ← Добавлено для передачи переменных на этапе сборки
      - VITE_API_URL=https://aivi-ai.it.com/api
      - VITE_CLERK_PUBLIC_KEY=${CLERK_PUBLIC_KEY}
  environment:
    - VITE_API_URL=https://aivi-ai.it.com/api
    - VITE_CLERK_PUBLIC_KEY=${CLERK_PUBLIC_KEY}
```

### 3. Исправлен порт backend
```yaml
backend:
  ports:
    - "8001:8001"  # Было 8000:8000
```

## Что нужно сделать на сервере 🚀

### Вариант 1: Автоматическое исправление
```bash
# 1. Подключитесь к серверу
ssh your-server

# 2. Перейдите в директорию проекта
cd /path/to/nfac-project-d

# 3. Получите последние изменения
git pull origin main

# 4. Запустите скрипт автоматического исправления
chmod +x fix_clerk_env.sh
./fix_clerk_env.sh
```

### Вариант 2: Ручное исправление
```bash
# 1. Проверьте .env файл
cat .env | grep CLERK_PUBLIC_KEY

# 2. Если переменная отсутствует или пустая, добавьте её:
echo "CLERK_PUBLIC_KEY=pk_live_ваш_ключ_здесь" >> .env

# 3. Пересоберите контейнеры
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Проверка результата ✅

### 1. Проверьте переменные окружения
```bash
chmod +x check_env_vars.sh
./check_env_vars.sh
```

### 2. Проверьте API эндпоинты
```bash
python3 check_api_routes.py https://aivi-ai.it.com
```

### 3. Проверьте логи контейнеров
```bash
docker-compose logs frontend | grep -i clerk
docker-compose logs backend | grep -i error
```

## Ожидаемый результат 🎉

После исправления:
1. ✅ `https://aivi-ai.it.com/api/users/me` возвращает 401/403 вместо 404
2. ✅ Frontend загружается без ошибок Clerk
3. ✅ Авторизация через Clerk работает
4. ✅ Профиль и избранное открываются корректно

## Получение Clerk ключей 🔑

1. Перейдите в [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys)
2. Выберите ваше приложение
3. Перейдите в раздел "API Keys"
4. Скопируйте:
   - **Publishable key** (начинается с `pk_live_`) → `CLERK_PUBLIC_KEY`
   - **Secret key** (начинается с `sk_live_`) → `CLERK_SECRET_KEY`

## Важные замечания ⚠️

1. **Используйте LIVE ключи**: `pk_live_...` и `sk_live_...`, не TEST ключи
2. **Проверьте домены**: В Clerk Dashboard убедитесь, что `aivi-ai.it.com` добавлен в разрешенные домены
3. **Кэш Docker**: Обязательно используйте `--no-cache` при пересборке

## Диагностика проблем 🔍

Если проблема не решается:

```bash
# Проверьте статус контейнеров
docker-compose ps

# Проверьте логи frontend
docker-compose logs frontend

# Проверьте переменные окружения в контейнере
docker exec $(docker ps -q -f name=frontend) env | grep VITE

# Проверьте сборку frontend
docker-compose build frontend --no-cache
``` 