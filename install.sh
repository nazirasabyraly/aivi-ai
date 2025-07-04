#!/bin/bash

echo "🚀 Установка зависимостей VibeMatch..."

# Проверяем, что мы в корневой папке проекта
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Запустите скрипт из корневой папки проекта"
    exit 1
fi

# Устанавливаем зависимости бэкенда
echo "🔧 Установка зависимостей бэкенда..."
cd backend
if command -v pip3 &> /dev/null; then
    pip3 install -r requirements.txt
elif command -v pip &> /dev/null; then
    pip install -r requirements.txt
else
    echo "❌ pip не установлен. Установите Python и pip"
    exit 1
fi
cd ..

# Устанавливаем зависимости фронтенда
echo "🎨 Установка зависимостей фронтенда..."
cd frontend
if command -v npm &> /dev/null; then
    npm install
else
    echo "❌ npm не установлен. Установите Node.js и npm"
    exit 1
fi
cd ..

echo "✅ Все зависимости установлены!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Создайте файл backend/.env на основе backend/.env.example"
echo "2. Настройте Spotify API credentials"
echo "3. Запустите приложение: ./start_app.sh"
echo "4. Запустите ngrok: ./start_ngrok.sh" 