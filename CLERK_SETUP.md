# Настройка Clerk для Email Верификации

## Шаг 1: Создание аккаунта Clerk

1. Перейдите на https://clerk.com/
2. Создайте аккаунт или войдите в существующий
3. Создайте новое приложение
4. Выберите "Email" в качестве метода аутентификации

## Шаг 2: Получение ключей

В панели управления Clerk:

1. Перейдите в раздел "API Keys"
2. Скопируйте **Publishable Key** и **Secret Key**

## Шаг 3: Настройка переменных окружения

### Frontend (.env файл)
```bash
VITE_CLERK_PUBLIC_KEY=pk_test_your_publishable_key_here
```

### Backend (.env файл)
```bash
# Добавьте эти переменные в backend/.env
CLERK_PUBLIC_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

## Шаг 4: Настройка Clerk Dashboard

1. В Clerk Dashboard перейдите в "User & Authentication" → "Email, Phone, Username"
2. Включите "Email address" как обязательное поле
3. Включите "Email verification" для подтверждения email
4. Настройте домены в "Domains" (добавьте localhost:3000 для разработки)

## Шаг 5: Настройка Redirect URLs

В Clerk Dashboard → "Domains":
- Добавьте `http://localhost:3000` для разработки
- Добавьте ваш production домен для продакшена

## Шаг 6: Настройка Email Provider (опционально)

Если хотите использовать свой SMTP:
1. Перейдите в "Messaging" → "Email"
2. Настройте свой SMTP провайдер
3. Или используйте встроенный Clerk email сервис

## Готово!

После настройки переменных окружения, Clerk будет автоматически:
- Отправлять email верификацию при регистрации
- Управлять сессиями пользователей
- Валидировать токены на backend 