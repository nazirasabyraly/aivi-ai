# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Устанавливаем переменные окружения для сборки
ARG VITE_API_URL=https://aivi-ai.it.com/api
ARG VITE_CLERK_PUBLIC_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLIC_KEY=$VITE_CLERK_PUBLIC_KEY

# Собираем проект
RUN npm run build

# Устанавливаем serve для продакшена
RUN npm install -g serve

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["serve", "-s", "dist", "-l", "3000"] 
