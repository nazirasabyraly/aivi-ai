#!/bin/bash

echo "🔧 Исправление проблем на сервере..."
echo "===================================="

# 1. Остановка и очистка контейнеров
echo "1. 🛑 Остановка старых контейнеров..."
docker-compose down -v --remove-orphans
sleep 2

echo "2. 🧹 Очистка Docker кеша..."
docker system prune -a -f
sleep 2

# 3. Проверка .env файла
echo "3. 📝 Проверка .env файла..."
if [ ! -f .env ]; then
    echo "❌ .env файл не найден! Создайте его со следующими переменными:"
    echo "CLERK_PUBLIC_KEY=pk_live_xxxxx"
    echo "CLERK_SECRET_KEY=sk_live_xxxxx"
    echo "FRONTEND_URL=https://aivi-ai.it.com"
    echo "BACKEND_BASE_URL=https://aivi-ai.it.com/api"
    echo "DATABASE_URL=postgresql://..."
    exit 1
fi

# 4. Проверка Clerk ключей
echo "4. 🔑 Проверка Clerk ключей..."
if ! grep -q "CLERK_PUBLIC_KEY=pk_live_" .env; then
    echo "⚠️ Внимание: Используется тестовый ключ Clerk (pk_test_)"
    echo "Для продакшена нужен LIVE ключ (pk_live_)"
fi

# 5. Пересборка и запуск
echo "5. 🔨 Пересборка контейнеров..."
docker-compose build --no-cache

echo "6. 🚀 Запуск контейнеров..."
docker-compose up -d

echo "7. ⏳ Ожидание запуска (30 сек)..."
sleep 30

# 8. Проверка статуса
echo "8. 📊 Проверка статуса контейнеров..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "9. 🌐 Тестирование API..."
if curl -s https://aivi-ai.it.com/api/health | grep -q "ok"; then
    echo "✅ API работает!"
else
    echo "❌ API не отвечает"
fi

echo ""
echo "10. 📋 Последние логи backend:"
echo "------------------------------"
docker logs --tail=10 $(docker ps -q --filter "name=backend") 2>/dev/null

echo ""
echo "11. 📋 Последние логи frontend:"
echo "-------------------------------"
docker logs --tail=10 $(docker ps -q --filter "name=frontend") 2>/dev/null

echo ""
echo "✅ Исправление завершено!"
echo "🌐 Проверьте сайт: https://aivi-ai.it.com"
echo "📚 API документация: https://aivi-ai.it.com/api/docs" 