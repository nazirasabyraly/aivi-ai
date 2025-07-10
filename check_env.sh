#!/bin/bash

echo "🔍 Проверка переменных окружения для продакшена..."
echo "=================================================="

# Проверяем .env файл
if [ ! -f .env ]; then
    echo "❌ .env файл не найден!"
    echo "Создайте .env файл с переменными для продакшена"
    exit 1
fi

echo "✅ .env файл найден"
echo ""

# Проверяем обязательные переменные
echo "🔧 Проверка обязательных переменных:"
echo "------------------------------------"

# Clerk
if grep -q "CLERK_PUBLIC_KEY=pk_live_" .env; then
    echo "✅ CLERK_PUBLIC_KEY (LIVE)"
else
    echo "⚠️ CLERK_PUBLIC_KEY не найден или не LIVE ключ"
fi

if grep -q "CLERK_SECRET_KEY=sk_live_" .env; then
    echo "✅ CLERK_SECRET_KEY (LIVE)"
else
    echo "⚠️ CLERK_SECRET_KEY не найден или не LIVE ключ"
fi

# URLs
if grep -q "FRONTEND_URL=https://aivi-ai.it.com" .env; then
    echo "✅ FRONTEND_URL (продакшен)"
else
    echo "⚠️ FRONTEND_URL не настроен для продакшена"
fi

if grep -q "BACKEND_BASE_URL=https://aivi-ai.it.com" .env; then
    echo "✅ BACKEND_BASE_URL (продакшен)"
else
    echo "⚠️ BACKEND_BASE_URL не настроен для продакшена"
fi

# Database
if grep -q "DATABASE_URL=postgresql" .env; then
    echo "✅ DATABASE_URL настроен"
else
    echo "❌ DATABASE_URL не найден"
fi

echo ""
echo "🎨 Проверка frontend переменных:"
echo "--------------------------------"

# Проверяем frontend/.env или переменные в docker-compose
if [ -f frontend/.env ]; then
    echo "Frontend .env файл найден"
    if grep -q "VITE_CLERK_PUBLIC_KEY=pk_live_" frontend/.env; then
        echo "✅ VITE_CLERK_PUBLIC_KEY (LIVE)"
    else
        echo "⚠️ VITE_CLERK_PUBLIC_KEY не найден или не LIVE ключ"
    fi
else
    echo "Frontend .env файл не найден (используется docker-compose environment)"
fi

echo ""
echo "🐳 Проверка docker-compose.yml:"
echo "-------------------------------"

if grep -q "VITE_API_URL=https://aivi-ai.it.com/api" docker-compose.yml; then
    echo "✅ VITE_API_URL настроен правильно"
else
    echo "⚠️ VITE_API_URL не настроен в docker-compose.yml"
fi

echo ""
echo "📋 Рекомендации:"
echo "----------------"
echo "1. Убедитесь, что все Clerk ключи LIVE (pk_live_, sk_live_)"
echo "2. Проверьте, что домены настроены в Clerk Dashboard"
echo "3. Добавьте https://aivi-ai.it.com в Clerk Domains"
echo "4. Настройте redirect URLs в Clerk Dashboard"
echo ""
echo "✅ Проверка завершена!" 