#!/bin/bash

echo "🔍 Диагностика 502 Bad Gateway ошибки..."
echo "========================================"

# 1. Проверяем статус контейнеров
echo "1. 📊 Статус Docker контейнеров:"
echo "--------------------------------"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""

# 2. Проверяем логи backend
echo "2. 📋 Логи backend (последние 30 строк):"
echo "----------------------------------------"
docker logs --tail=30 $(docker ps -q --filter "name=backend") 2>/dev/null || echo "❌ Backend контейнер не найден"

echo ""

# 3. Проверяем внутренние порты
echo "3. 🔌 Проверка внутренних портов:"
echo "---------------------------------"
echo "Backend health check (внутренний):"
docker exec $(docker ps -q --filter "name=backend") curl -s http://localhost:8001/health 2>/dev/null || echo "❌ Backend не отвечает внутри контейнера"

echo ""

# 4. Проверяем доступность API снаружи
echo "4. 🌐 Проверка внешнего API:"
echo "----------------------------"
echo "Прямой доступ к API:"
curl -s -w "Status: %{http_code}\n" https://aivi-ai.it.com/api/health || echo "❌ Внешний API недоступен"

echo ""

# 5. Проверяем переменные окружения backend
echo "5. 🔧 Переменные окружения backend:"
echo "-----------------------------------"
docker exec $(docker ps -q --filter "name=backend") env | grep -E "(CLERK|DATABASE|FRONTEND)" | sort 2>/dev/null || echo "❌ Не удалось получить переменные"

echo ""

# 6. Проверяем ошибки в логах
echo "6. ❌ Поиск ошибок в логах:"
echo "---------------------------"
docker logs $(docker ps -q --filter "name=backend") 2>&1 | grep -i -E "(error|exception|traceback|failed)" | tail -10 || echo "Критических ошибок не найдено"

echo ""

# 7. Проверяем память и ресурсы
echo "7. 💾 Использование ресурсов:"
echo "-----------------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
echo "✅ Диагностика завершена!"
echo ""
echo "📋 Рекомендации:"
echo "1. Если backend не запущен - перезапустите: docker-compose restart backend"
echo "2. Если есть ошибки в логах - исправьте их"
echo "3. Если нехватка памяти - увеличьте ресурсы"
echo "4. Если database недоступна - проверьте подключение" 