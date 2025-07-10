#!/bin/bash

echo "🔧 Применение миграции Alembic на сервере..."
echo "============================================"

# 1. Проверяем что мы на сервере
if [ ! -f .env ]; then
    echo "❌ .env файл не найден! Убедитесь что вы на сервере."
    exit 1
fi

# 2. Проверяем статус базы данных
echo "1. 📊 Проверка статуса базы данных..."
echo "------------------------------------"
docker exec $(docker ps -q --filter "name=backend") alembic current 2>/dev/null || echo "⚠️ Не удалось получить текущую версию"

# 3. Показываем доступные миграции
echo ""
echo "2. 📋 Доступные миграции:"
echo "------------------------"
docker exec $(docker ps -q --filter "name=backend") alembic history 2>/dev/null || echo "⚠️ Не удалось получить историю миграций"

# 4. Создаем backup базы данных (на всякий случай)
echo ""
echo "3. 💾 Создание backup базы данных..."
echo "-----------------------------------"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec $(docker ps -q --filter "name=db") pg_dump -U nfac_user nfac_db > $BACKUP_FILE 2>/dev/null && echo "✅ Backup создан: $BACKUP_FILE" || echo "⚠️ Не удалось создать backup"

# 5. Применяем миграции
echo ""
echo "4. 🚀 Применение миграций..."
echo "---------------------------"
echo "Выполняем: alembic upgrade head"
docker exec $(docker ps -q --filter "name=backend") alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Миграции применены успешно!"
else
    echo "❌ Ошибка при применении миграций!"
    echo "📋 Логи backend:"
    docker logs --tail=20 $(docker ps -q --filter "name=backend")
    exit 1
fi

# 6. Проверяем результат
echo ""
echo "5. ✅ Проверка результата..."
echo "---------------------------"
echo "Текущая версия базы данных:"
docker exec $(docker ps -q --filter "name=backend") alembic current

echo ""
echo "Проверяем наличие колонки clerk_id:"
docker exec $(docker ps -q --filter "name=db") psql -U nfac_user -d nfac_db -c "\d users" | grep clerk_id && echo "✅ Колонка clerk_id добавлена!" || echo "❌ Колонка clerk_id не найдена"

# 7. Перезапускаем backend для применения изменений
echo ""
echo "6. 🔄 Перезапуск backend..."
echo "--------------------------"
docker-compose restart backend

echo ""
echo "⏳ Ожидание запуска backend (10 сек)..."
sleep 10

# 8. Финальная проверка
echo ""
echo "7. 🧪 Финальная проверка API..."
echo "------------------------------"
if curl -s https://aivi-ai.it.com/api/health | grep -q "ok"; then
    echo "✅ API работает!"
    echo "✅ Миграция завершена успешно!"
else
    echo "❌ API не отвечает после миграции"
    echo "📋 Логи backend:"
    docker logs --tail=10 $(docker ps -q --filter "name=backend")
fi

echo ""
echo "📋 Что дальше:"
echo "1. Проверьте сайт: https://aivi-ai.it.com"
echo "2. Попробуйте войти через Clerk"
echo "3. Проверьте что избранное работает" 