#!/bin/bash

echo "🚀 Быстрое исправление проблем на продакшене..."
echo "==============================================="

# 1. Проверяем что мы на сервере
if [ ! -f .env ]; then
    echo "❌ .env файл не найден! Убедитесь что вы на сервере."
    exit 1
fi

# 2. Проверяем Clerk ключи
echo "🔑 Проверка Clerk ключей..."
if ! grep -q "CLERK_PUBLIC_KEY=pk_live_" .env; then
    echo "⚠️ ВНИМАНИЕ: Используется тестовый ключ Clerk!"
    echo "Для продакшена нужен LIVE ключ (pk_live_)"
    echo "Проверьте .env файл"
fi

# 3. Пересобираем только backend (быстрее)
echo "🔨 Пересборка backend..."
docker-compose stop backend
docker-compose build --no-cache backend
docker-compose up -d backend

# 4. Ждем запуска
echo "⏳ Ожидание запуска backend (15 сек)..."
sleep 15

# 5. Проверяем статус
echo "📊 Проверка статуса..."
if curl -s https://aivi-ai.it.com/api/health | grep -q "ok"; then
    echo "✅ Backend работает!"
else
    echo "❌ Backend не отвечает"
    echo "📋 Логи backend:"
    docker logs --tail=10 $(docker ps -q --filter "name=backend")
    exit 1
fi

# 6. Пересобираем frontend
echo "🎨 Пересборка frontend..."
docker-compose stop frontend  
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo "⏳ Ожидание запуска frontend (15 сек)..."
sleep 15

# 7. Финальная проверка
echo "🧪 Финальная проверка..."
echo "API Health: $(curl -s https://aivi-ai.it.com/api/health)"
echo "Frontend доступен: $(curl -s -o /dev/null -w "%{http_code}" https://aivi-ai.it.com)"

echo ""
echo "✅ Исправления применены!"
echo "🌐 Проверьте сайт: https://aivi-ai.it.com"
echo "📋 Если проблемы остаются, запустите: ./check_production_env.sh" 