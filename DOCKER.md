# 🐳 Docker Развертывание NFAC Project

## Быстрый старт

### 1. Подготовка
```bash
# Клонируйте репозиторий (если еще не сделали)
git clone <your-repo>
cd nfac-project

# Создайте .env файл
cp .env.example .env
```

### 2. Настройка переменных окружения
Отредактируйте файл `.env` и укажите ваши API ключи:

```env
# PostgreSQL Database
POSTGRES_DB=nfac_db
POSTGRES_USER=nfac_user
POSTGRES_PASSWORD=your_strong_password

# Azure OpenAI (обязательно!)
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-01

# Riffusion (для генерации музыки)
RIFFUSION_API_KEY=your_riffusion_key

# YouTube API (для поиска и конвертации музыки)
YOUTUBE_API_KEY=your_youtube_api_key

# OpenAI Fallback (опционально)
OPENAI_API_KEY=your_openai_key
```

### 3. Запуск
```bash
# Запуск с автоматической сборкой
./docker-start.sh

# Или вручную
docker-compose up --build
```

### 4. Доступ к приложению
- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:8000
- 📚 **API Docs**: http://localhost:8000/docs
- 🗄️ **PostgreSQL**: localhost:5432

## Управление

### Остановка
```bash
# Остановка контейнеров
./docker-stop.sh

# Или вручную
docker-compose down
```

### Полная очистка
```bash
# Удаление контейнеров, сетей и volumes
docker-compose down -v --remove-orphans

# Удаление образов
docker system prune -a
```

### Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend

# Только база данных
docker-compose logs -f db
```

## Структура Docker

```
nfac-project/
├── docker-compose.yml      # Главный файл конфигурации
├── backend/
│   └── Dockerfile         # Backend контейнер (FastAPI + Python)
├── frontend/
│   └── Dockerfile         # Frontend контейнер (React + Vite)
└── .env                   # Переменные окружения
```

## Сервисы

### 🔧 Backend (FastAPI)
- **Порт**: 8000
- **База данных**: PostgreSQL
- **Функции**: API, анализ изображений, рекомендации

### 🌐 Frontend (React + Vite)
- **Порт**: 3000
- **Сборка**: Продакшн билд с serve
- **Подключение**: Автоматически к backend:8000

### 🗄️ PostgreSQL
- **Порт**: 5432
- **Данные**: Сохраняются в Docker volume
- **Health check**: Автоматическая проверка

## Troubleshooting

### Проблемы с правами доступа
```bash
# Дать права на выполнение скриптам
chmod +x docker-start.sh docker-stop.sh
```

### Проблемы с портами
```bash
# Проверить занятые порты
lsof -i :3000
lsof -i :8000
lsof -i :5432

# Остановить процессы
sudo kill -9 <PID>
```

### Пересборка образов
```bash
# Полная пересборка без кэша
docker-compose build --no-cache
docker-compose up
```

### Подключение к базе данных
```bash
# Вход в контейнер PostgreSQL
docker-compose exec db psql -U nfac_user -d nfac_db
``` 