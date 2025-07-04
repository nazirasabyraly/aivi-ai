#!/bin/bash

echo "🚀 Запуск VibeMatch приложения..."

# Проверяем, что мы в корневой папке проекта
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Запустите скрипт из корневой папки проекта"
    exit 1
fi

# Функция для очистки при выходе
cleanup() {
    echo ""
    echo "🛑 Остановка приложения..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Перехватываем сигнал для корректного завершения
trap cleanup SIGINT SIGTERM

# Запускаем бэкенд
echo "🔧 Запуск бэкенда..."
cd backend
if command -v python3 &> /dev/null; then
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
elif command -v python &> /dev/null; then
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
else
    echo "❌ Python не установлен"
    exit 1
fi
BACKEND_PID=$!
cd ..

# Ждем запуска бэкенда
sleep 3

# Запускаем фронтенд
echo "🎨 Запуск фронтенда..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Приложение запущено!"
echo "🔧 Бэкенд: http://localhost:8001"
echo "🎨 Фронтенд: http://localhost:3000"
echo ""
echo "Для остановки нажмите Ctrl+C"

# Ждем завершения
wait 