#!/bin/bash

echo "🔧 Настройка переменных окружения..."

# Проверяем, существует ли .env файл
if [ ! -f "backend/.env" ]; then
    echo "📝 Создание .env файла..."
    touch backend/.env
fi

echo ""
echo "🤖 Введите OpenAI API Key:"
read -p "OpenAI API Key: " openai_api_key

echo ""
echo "🌐 Введите frontend ngrok URL (например: https://def456.ngrok-free.app):"
read -p "Frontend ngrok URL: " frontend_ngrok_url

# Устанавливаем значения по умолчанию
if [ -z "$frontend_ngrok_url" ]; then
    frontend_ngrok_url="http://localhost:3000"
fi

# Backend всегда localhost
backend_url="http://localhost:8001"

# Записываем в .env файл
cat > backend/.env << EOF
# OpenAI API credentials
OPENAI_API_KEY=$openai_api_key

# Frontend URL
FRONTEND_URL=$frontend_ngrok_url

# Backend settings
HOST=0.0.0.0
PORT=8001
EOF

echo ""
echo "✅ .env файл создан!"
echo ""
echo "📝 Содержимое файла:"
echo "=================="
cat backend/.env
echo "=================="
echo ""
echo "🚀 Теперь можете запустить приложение:"
echo "   ./start_app_improved.sh" 