#!/bin/bash

echo "🔧 Исправление проблемы с VITE_CLERK_PUBLIC_KEY..."
echo "=" × 50

# Проверяем, запущен ли скрипт от root или с sudo
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Скрипт запущен от root. Убедитесь, что вы в правильной директории."
fi

# Переходим в директорию проекта
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml не найден. Убедитесь, что вы в корне проекта."
    exit 1
fi

echo "✅ Найден docker-compose.yml"

# Проверяем .env файл
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден!"
    echo "💡 Создайте .env файл со следующим содержимым:"
    echo ""
    echo "CLERK_PUBLIC_KEY=pk_live_your_clerk_public_key_here"
    echo "CLERK_SECRET_KEY=sk_live_your_clerk_secret_key_here"
    echo "DATABASE_URL=postgresql://nfac_user:nfac_strong_password_123@db:5432/nfac_db"
    echo "SECRET_KEY=your-secret-key-here"
    echo ""
    exit 1
fi

# Проверяем CLERK_PUBLIC_KEY в .env
if ! grep -q "CLERK_PUBLIC_KEY=" .env; then
    echo "❌ CLERK_PUBLIC_KEY не найден в .env"
    echo "💡 Добавьте в .env файл:"
    echo "CLERK_PUBLIC_KEY=pk_live_your_clerk_public_key_here"
    exit 1
fi

CLERK_KEY=$(grep "CLERK_PUBLIC_KEY=" .env | cut -d'=' -f2)
if [ -z "$CLERK_KEY" ] || [ "$CLERK_KEY" = "" ]; then
    echo "❌ CLERK_PUBLIC_KEY пустой в .env"
    echo "💡 Установите правильное значение в .env файле"
    exit 1
fi

echo "✅ CLERK_PUBLIC_KEY найден: ${CLERK_KEY:0:15}..."

# Останавливаем контейнеры
echo ""
echo "🛑 Останавливаем контейнеры..."
docker-compose down

# Пересобираем без кэша
echo ""
echo "🔨 Пересобираем контейнеры без кэша..."
docker-compose build --no-cache

# Запускаем контейнеры
echo ""
echo "🚀 Запускаем контейнеры..."
docker-compose up -d

# Ждем запуска
echo ""
echo "⏳ Ждем запуска контейнеров..."
sleep 10

# Проверяем статус
echo ""
echo "📊 Статус контейнеров:"
docker-compose ps

# Проверяем переменные окружения в frontend контейнере
echo ""
echo "🔍 Проверяем переменные в frontend контейнере..."
FRONTEND_CONTAINER=$(docker ps -q -f name=frontend)
if [ -n "$FRONTEND_CONTAINER" ]; then
    echo "Frontend контейнер ID: $FRONTEND_CONTAINER"
    docker exec $FRONTEND_CONTAINER env | grep VITE || echo "❌ VITE переменные не найдены"
else
    echo "❌ Frontend контейнер не найден"
fi

# Проверяем доступность API
echo ""
echo "🌐 Проверяем доступность API..."
sleep 5
curl -s http://localhost:8001/health | grep -q "ok" && echo "✅ Backend API работает" || echo "❌ Backend API недоступен"

echo ""
echo "🎉 Исправление завершено!"
echo ""
echo "💡 Если проблема не решена:"
echo "1. Проверьте правильность CLERK_PUBLIC_KEY в .env"
echo "2. Убедитесь, что используете LIVE ключи (pk_live_...)"
echo "3. Проверьте логи: docker-compose logs frontend"
echo "4. Откройте https://aivi-ai.it.com и проверьте браузерную консоль" 