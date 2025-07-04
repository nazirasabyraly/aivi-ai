#!/bin/bash

echo "🐳 Запуск проекта в Docker..."

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден!"
    echo "📝 Создайте .env файл на основе .env.example:"
    echo "   cp .env.example .env"
    echo "   # Затем отредактируйте .env со своими API ключами"
    exit 1
fi

echo "🔨 Собираем и запускаем контейнеры..."
docker-compose up --build

echo "✅ Проект запущен!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "🗄️  PostgreSQL: localhost:5434" 