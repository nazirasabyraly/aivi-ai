# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Устанавливаем переменную окружения для сборки
ENV VITE_API_URL=https://aivi-ai.it.com/api

# Собираем проект
RUN npm run build

# Устанавливаем serve для продакшена
RUN npm install -g serve

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["serve", "-s", "dist", "-l", "3000"] 
