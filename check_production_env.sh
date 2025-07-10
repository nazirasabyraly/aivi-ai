#!/bin/bash

echo "🔍 Проверка переменных окружения на продакшене..."
echo "================================================="

# Проверяем backend переменные
echo "🔧 Backend переменные:"
echo "---------------------"
docker exec $(docker ps -q --filter "name=backend") env | grep -E "(CLERK|FRONTEND|BACKEND)" | sort

echo ""
echo "🎨 Frontend переменные:"
echo "----------------------"
docker exec $(docker ps -q --filter "name=frontend") env | grep -E "(VITE|CLERK)" | sort

echo ""
echo "🌐 Проверка API endpoints:"
echo "-------------------------"
echo "Health check:"
curl -s https://aivi-ai.it.com/api/health | jq . || echo "❌ API недоступен"

echo ""
echo "OAuth debug:"
curl -s https://aivi-ai.it.com/api/auth/oauth-debug | jq . || echo "❌ OAuth debug недоступен"

echo ""
echo "📋 Логи backend (последние 20 строк):"
echo "-------------------------------------"
docker logs --tail=20 $(docker ps -q --filter "name=backend")

echo ""
echo "✅ Проверка завершена!" 