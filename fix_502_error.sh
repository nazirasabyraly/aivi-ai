#!/bin/bash

echo "🔧 Диагностика и исправление 502 Bad Gateway ошибки"
echo "=" × 60

# Проверяем, что мы в корне проекта
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Убедитесь, что вы в корне проекта (нужен docker-compose.yml)"
    exit 1
fi

echo "✅ Найден docker-compose.yml"

# Шаг 1: Проверяем структуру базы данных
echo ""
echo "1️⃣  Проверяем структуру базы данных..."
if [ -f "check_clerk_migration.py" ]; then
    python3 check_clerk_migration.py
else
    echo "❌ Скрипт check_clerk_migration.py не найден"
fi

# Шаг 2: Проверяем логи backend контейнера
echo ""
echo "2️⃣  Проверяем логи backend контейнера..."
if docker ps | grep -q backend; then
    echo "📋 Последние логи backend:"
    docker-compose logs --tail=20 backend | grep -E "(ERROR|Exception|Traceback|❌|502)" || echo "Нет явных ошибок в логах"
else
    echo "❌ Backend контейнер не запущен"
fi

# Шаг 3: Тестируем API эндпоинты
echo ""
echo "3️⃣  Тестируем API эндпоинты..."

# Проверяем health check
echo "🌐 Проверяем /health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ /health работает ($HEALTH_STATUS)"
else
    echo "❌ /health не работает ($HEALTH_STATUS)"
fi

# Проверяем protected endpoint без авторизации
echo "🔒 Проверяем /api/users/me без авторизации..."
USERS_ME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/users/me)
echo "📊 /api/users/me статус: $USERS_ME_STATUS"

if [ "$USERS_ME_STATUS" = "401" ] || [ "$USERS_ME_STATUS" = "403" ] || [ "$USERS_ME_STATUS" = "422" ]; then
    echo "✅ API работает корректно (возвращает $USERS_ME_STATUS для неавторизованного запроса)"
elif [ "$USERS_ME_STATUS" = "404" ]; then
    echo "❌ API роут не найден (404) - проблема с роутингом в main.py"
elif [ "$USERS_ME_STATUS" = "502" ]; then
    echo "❌ Bad Gateway (502) - проблема в backend коде или БД"
elif [ "$USERS_ME_STATUS" = "500" ]; then
    echo "❌ Internal Server Error (500) - проблема в backend коде"
else
    echo "⚠️  Неожиданный статус: $USERS_ME_STATUS"
fi

# Шаг 4: Проверяем переменные окружения
echo ""
echo "4️⃣  Проверяем переменные окружения..."
if [ -f ".env" ]; then
    if grep -q "CLERK_PUBLIC_KEY=" .env; then
        CLERK_KEY=$(grep "CLERK_PUBLIC_KEY=" .env | cut -d'=' -f2)
        if [ -n "$CLERK_KEY" ]; then
            echo "✅ CLERK_PUBLIC_KEY установлен: ${CLERK_KEY:0:15}..."
        else
            echo "❌ CLERK_PUBLIC_KEY пустой"
        fi
    else
        echo "❌ CLERK_PUBLIC_KEY не найден в .env"
    fi
else
    echo "❌ Файл .env не найден"
fi

# Шаг 5: Предлагаем решения
echo ""
echo "🎯 ДИАГНОЗ И РЕШЕНИЯ:"
echo "=" × 60

if [ "$USERS_ME_STATUS" = "502" ]; then
    echo "❌ ПРОБЛЕМА: 502 Bad Gateway"
    echo ""
    echo "💡 НАИБОЛЕЕ ВЕРОЯТНАЯ ПРИЧИНА:"
    echo "   Отсутствует колонка clerk_id в таблице users"
    echo ""
    echo "🔧 РЕШЕНИЕ:"
    echo "   1. Применить миграцию базы данных:"
    echo "      chmod +x apply_migration.sh"
    echo "      ./apply_migration.sh"
    echo ""
    echo "   2. Пересобрать контейнеры с исправленным кодом:"
    echo "      git pull origin main"
    echo "      docker-compose down"
    echo "      docker-compose build --no-cache"
    echo "      docker-compose up -d"
    
elif [ "$USERS_ME_STATUS" = "404" ]; then
    echo "❌ ПРОБЛЕМА: 404 Not Found"
    echo ""
    echo "💡 ПРИЧИНА:"
    echo "   Роуты не имеют префикса /api в main.py"
    echo ""
    echo "🔧 РЕШЕНИЕ:"
    echo "   git pull origin main  # (уже исправлено)"
    echo "   docker-compose build --no-cache"
    echo "   docker-compose up -d"
    
elif [ "$USERS_ME_STATUS" = "401" ] || [ "$USERS_ME_STATUS" = "403" ] || [ "$USERS_ME_STATUS" = "422" ]; then
    echo "✅ ХОРОШИЕ НОВОСТИ: API работает!"
    echo ""
    echo "💡 ПРОБЛЕМА может быть в:"
    echo "   1. Переменных окружения frontend (VITE_CLERK_PUBLIC_KEY)"
    echo "   2. Кэше браузера"
    echo ""
    echo "🔧 РЕШЕНИЕ:"
    echo "   ./fix_clerk_env.sh"
else
    echo "⚠️  НЕОПРЕДЕЛЕННАЯ ПРОБЛЕМА"
    echo ""
    echo "🔧 ПОПРОБУЙТЕ:"
    echo "   1. Проверить логи: docker-compose logs backend"
    echo "   2. Перезапустить: docker-compose restart"
    echo "   3. Полная пересборка: docker-compose down && docker-compose build --no-cache && docker-compose up -d"
fi

echo ""
echo "📞 Если проблема не решается:"
echo "   - Проверьте логи: docker-compose logs backend | tail -50"
echo "   - Проверьте БД: python3 check_clerk_migration.py"
echo "   - Обратитесь к разработчику с логами" 