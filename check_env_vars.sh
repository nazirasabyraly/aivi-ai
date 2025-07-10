#!/bin/bash

echo "🔍 Проверка переменных окружения для Docker..."
echo "=" × 50

# Проверяем основной .env файл
if [ -f .env ]; then
    echo "✅ Файл .env найден"
    
    # Проверяем CLERK_PUBLIC_KEY
    if grep -q "CLERK_PUBLIC_KEY=" .env; then
        CLERK_KEY=$(grep "CLERK_PUBLIC_KEY=" .env | cut -d'=' -f2)
        if [ -n "$CLERK_KEY" ] && [ "$CLERK_KEY" != "" ]; then
            echo "✅ CLERK_PUBLIC_KEY установлен: ${CLERK_KEY:0:15}..."
        else
            echo "❌ CLERK_PUBLIC_KEY пустой в .env"
        fi
    else
        echo "❌ CLERK_PUBLIC_KEY не найден в .env"
    fi
    
    # Проверяем другие важные переменные
    echo ""
    echo "📋 Другие переменные:"
    for var in "DATABASE_URL" "SECRET_KEY" "CLERK_SECRET_KEY"; do
        if grep -q "$var=" .env; then
            VALUE=$(grep "$var=" .env | cut -d'=' -f2)
            if [ -n "$VALUE" ]; then
                echo "✅ $var установлен"
            else
                echo "❌ $var пустой"
            fi
        else
            echo "❌ $var не найден"
        fi
    done
    
else
    echo "❌ Файл .env не найден!"
    echo "💡 Создайте .env файл с необходимыми переменными"
fi

echo ""
echo "🐳 Проверка Docker контейнеров..."

# Проверяем, запущены ли контейнеры
if command -v docker >/dev/null 2>&1; then
    if docker ps | grep -q "frontend"; then
        echo "✅ Frontend контейнер запущен"
        
        # Проверяем переменные окружения в контейнере
        echo "🔍 Переменные окружения в frontend контейнере:"
        docker exec $(docker ps -q -f ancestor=nfac-project-d-frontend) env | grep VITE || echo "❌ VITE переменные не найдены"
    else
        echo "❌ Frontend контейнер не запущен"
    fi
    
    if docker ps | grep -q "backend"; then
        echo "✅ Backend контейнер запущен"
    else
        echo "❌ Backend контейнер не запущен"
    fi
else
    echo "❌ Docker не установлен или недоступен"
fi

echo ""
echo "💡 Для исправления проблемы с VITE_CLERK_PUBLIC_KEY:"
echo "1. Убедитесь, что CLERK_PUBLIC_KEY установлен в .env"
echo "2. Пересоберите и перезапустите контейнеры:"
echo "   docker-compose down"
echo "   docker-compose build --no-cache"
echo "   docker-compose up -d"
echo ""
echo "🔗 Получить CLERK_PUBLIC_KEY: https://dashboard.clerk.com/last-active?path=api-keys" 