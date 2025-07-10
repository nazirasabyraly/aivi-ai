#!/bin/bash

echo "🔍 Диагностика проблем на сервере..."
echo "=================================="

# 1. Проверяем переменные окружения
echo "1. 🔧 Проверка переменных окружения:"
echo "-----------------------------------"
if [ -f .env ]; then
    echo "✅ .env файл найден"
    echo "📝 Clerk настройки:"
    grep "CLERK_" .env | sed 's/=.*/=***/' || echo "❌ Clerk переменные не найдены"
    echo "📝 Frontend URL:"
    grep "FRONTEND_URL" .env || echo "❌ FRONTEND_URL не найдена"
    echo "📝 Backend URL:"
    grep "BACKEND_BASE_URL" .env || echo "❌ BACKEND_BASE_URL не найдена"
else
    echo "❌ .env файл не найден!"
fi

echo ""

# 2. Проверяем Docker контейнеры
echo "2. 🐳 Проверка Docker контейнеров:"
echo "-----------------------------------"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""

# 3. Проверяем логи
echo "3. 📋 Последние логи backend:"
echo "----------------------------"
docker logs --tail=20 $(docker ps -q --filter "name=backend") 2>/dev/null || echo "❌ Backend контейнер не найден"

echo ""

# 4. Проверяем доступность API
echo "4. 🌐 Проверка API endpoints:"
echo "----------------------------"
echo "Checking /health endpoint..."
curl -s https://aivi-ai.it.com/api/health | jq . 2>/dev/null || echo "❌ API недоступен"

echo ""
echo "Checking /auth/oauth-debug endpoint..."
curl -s https://aivi-ai.it.com/api/auth/oauth-debug | jq . 2>/dev/null || echo "❌ OAuth debug недоступен"

echo ""

# 5. Проверяем frontend переменные
echo "5. 🎨 Проверка frontend переменных:"
echo "-----------------------------------"
echo "Checking frontend environment..."
docker exec $(docker ps -q --filter "name=frontend") env | grep VITE_ 2>/dev/null || echo "❌ Frontend переменные недоступны"

echo ""

# 6. Рекомендации по исправлению
echo "6. 🔧 Рекомендации по исправлению:"
echo "-----------------------------------"
echo "Для исправления проблем выполните:"
echo "1. docker-compose down -v --remove-orphans"
echo "2. docker system prune -a -f"
echo "3. Проверьте .env файл"
echo "4. docker-compose up --build -d"
echo "5. Проверьте логи: docker-compose logs -f"

echo ""
echo "✅ Диагностика завершена!" 