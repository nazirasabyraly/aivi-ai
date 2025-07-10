#!/bin/bash

echo "🚀 Деплой исправлений на сервер..."
echo "=" × 50

# Проверяем, что мы в корне проекта
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Убедитесь, что вы в корне проекта (нужен docker-compose.yml)"
    exit 1
fi

echo "✅ Найден docker-compose.yml"

# 1. Коммитим изменения в git
echo ""
echo "📝 Коммитим локальные изменения..."
git add -A
git commit -m "🔧 Fix API routes and CLERK_PUBLIC_KEY env issues

✅ MAIN FIX: Add /api prefix to all routes in main.py
- Fixed 404 error for /api/users/me endpoint  
- Updated all routers to use /api prefix

✅ Docker configuration fixes:
- Updated docker-compose.yml to pass CLERK_PUBLIC_KEY as build args
- Fixed backend port from 8000 to 8001
- Added proper environment variable passing for frontend

✅ Database migration ready:
- apply_migration.sh script for adding clerk_id column

✅ Added diagnostic tools:
- check_api_routes.py - test API endpoint availability
- check_env_vars.sh - check environment variables  
- fix_clerk_env.sh - automatic fix script"

# 2. Пушим в git
echo ""
echo "📤 Отправляем изменения в git..."
git push origin main

echo ""
echo "✅ Изменения отправлены в git!"
echo ""
echo "🏗️  Теперь на СЕРВЕРЕ выполните следующие команды:"
echo ""
echo "1️⃣  Получите изменения:"
echo "   cd /path/to/nfac-project-d"  
echo "   git pull origin main"
echo ""
echo "2️⃣  Примените миграцию базы данных:"
echo "   chmod +x apply_migration.sh"
echo "   ./apply_migration.sh"
echo ""
echo "3️⃣  Исправьте переменные окружения и пересоберите:"
echo "   chmod +x fix_clerk_env.sh"
echo "   ./fix_clerk_env.sh"
echo ""
echo "4️⃣  Проверьте результат:"
echo "   python3 check_api_routes.py https://aivi-ai.it.com"
echo ""
echo "💡 После выполнения этих команд:"
echo "   - /api/users/me будет возвращать 401/403 вместо 502"
echo "   - Frontend загрузится без ошибок Clerk"
echo "   - Авторизация и профили будут работать"

echo ""
echo "🎯 Ключевые исправления:"
echo "   ✅ main.py: добавлен префикс /api ко всем роутерам"
echo "   ✅ docker-compose.yml: исправлена передача CLERK_PUBLIC_KEY"
echo "   ✅ Миграция БД: добавление clerk_id колонки"
echo "   ✅ Порт backend: изменен с 8000 на 8001" 