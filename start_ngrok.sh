#!/bin/bash

echo "🚀 Запуск VibeMatch с ngrok..."

# Проверяем, установлен ли ngrok
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok не установлен. Установите ngrok: https://ngrok.com/download"
    exit 1
fi

# Создаем папку для логов
mkdir -p logs

echo "�� Запуск ngrok туннеля для фронтенда (порт 3000)..."
ngrok http 3000 --log=logs/frontend_ngrok.log &
FRONTEND_NGROK_PID=$!

sleep 5

echo "✅ Туннель запущен!"
echo "📊 Проверьте логи в папке logs/"
echo "🌐 Откройте http://localhost:4040 для просмотра ngrok интерфейса"
echo ""
echo "Для остановки нажмите Ctrl+C"

cleanup() {
    echo ""
    echo "🛑 Остановка ngrok туннеля..."
    kill $FRONTEND_NGROK_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

wait 