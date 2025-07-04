#!/bin/bash

echo "🛑 Остановка Docker контейнеров..."

docker-compose down

echo "✅ Контейнеры остановлены!"
echo "🧹 Для полной очистки (включая данные) используйте:"
echo "   docker-compose down -v --remove-orphans" 