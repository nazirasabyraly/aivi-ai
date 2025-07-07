# Google OAuth и Email Verification - Инструкция по настройке

## Новые возможности

Теперь ваше приложение поддерживает:

1. **Google OAuth** - быстрый вход через Google аккаунт
2. **Email Verification** - подтверждение email при регистрации
3. **Улучшенная безопасность** - проверка email перед полным доступом

## Настройка Google OAuth

### 1. Создание проекта в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API:
   - Перейдите в "APIs & Services" → "Library"
   - Найдите "Google+ API" и включите его

### 2. Настройка OAuth 2.0 credentials

1. Перейдите в "APIs & Services" → "Credentials"
2. Нажмите "Create Credentials" → "OAuth 2.0 Client IDs"
3. Выберите "Web application"
4. Настройте:
   - **Name**: "Aivi Music App"
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (для разработки)
     - `http://localhost:5173` (для Vite dev server)
     - Ваш production домен
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:5173/auth/callback`
     - Ваш production redirect URI

### 3. Получение Client ID

1. Скопируйте **Client ID** (выглядит как: `123456789-abcdef.apps.googleusercontent.com`)
2. Добавьте его в файл `.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

## Настройка Email Verification

### Вариант 1: Использование существующего SMTP_API_KEY

Если у вас уже есть SMTP_API_KEY, система автоматически будет использовать его:

```env
SMTP_API_KEY=your-smtp-api-key-here
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Aivi Music
```

### Вариант 2: Brevo API (рекомендуется)

1. Зарегистрируйтесь на [Brevo](https://www.brevo.com/)
2. Получите API ключ в разделе "SMTP & API"
3. Добавьте в `.env`:

```env
BREVO_API_KEY=your-brevo-api-key-here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Aivi Music
```

### Вариант 3: Режим разработки

Если не настроить ни один из вариантов, коды будут выводиться в консоль backend:

```
=== 📧 EMAIL VERIFICATION (FALLBACK MODE) ===
📩 To: user@example.com
🔑 Verification Code: 123456
⏰ Expires in 15 minutes
==========================================
```

## Пример полного .env файла

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com

# Email Service (выберите один вариант)
# Вариант 1: SMTP
SMTP_API_KEY=your-smtp-api-key-here
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Aivi Music

# Вариант 2: Brevo API
BREVO_API_KEY=your-brevo-api-key-here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Aivi Music

# Azure OpenAI (если используете)
AZURE_OPENAI_API_KEY=your-azure-openai-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-35-turbo
```

## Запуск системы

### Backend
```bash
cd backend
python3 -m uvicorn app.main:app --reload --port 8001
```

### Frontend
```bash
cd frontend
npm run dev
```

## Как работает система

### 1. Google OAuth
- Пользователь нажимает кнопку "Sign in with Google"
- Google возвращает ID token
- Backend верифицирует token и создает/обновляет пользователя
- Пользователь автоматически авторизован

### 2. Email Registration
- Пользователь регистрируется через форму
- Отправляется email с 6-значным кодом
- Пользователь вводит код для подтверждения
- После подтверждения получает доступ к приложению

### 3. Email Login
- Если email не подтвержден, показывается форма верификации
- Можно запросить новый код
- После подтверждения пользователь авторизован

## Новые API Endpoints

### POST /users/google-auth
```json
{
  "token": "google-id-token-here"
}
```

### POST /users/verify-email
```json
{
  "email": "user@example.com",
  "verification_code": "123456"
}
```

### POST /users/resend-verification
```json
{
  "email": "user@example.com"
}
```

## Troubleshooting

### 1. Google OAuth не работает
- Проверьте GOOGLE_CLIENT_ID в .env
- Убедитесь, что домен добавлен в Authorized origins
- Проверьте консоль браузера на ошибки

### 2. Email не отправляется
- Проверьте SMTP_API_KEY или BREVO_API_KEY
- Убедитесь, что FROM_EMAIL корректный
- Проверьте логи backend в терминале

### 3. Код верификации не принимается
- Код действует 15 минут
- Убедитесь, что вводите правильный код
- Попробуйте запросить новый код

## Безопасность

1. **Google OAuth** - использует официальный Google Identity Services
2. **Email Verification** - коды истекают через 15 минут
3. **JWT Tokens** - для безопасной авторизации
4. **CORS** - настроен для разрешенных доменов

## Дополнительные возможности

- **Связывание аккаунтов**: Если пользователь регистрируется через email, а потом входит через Google с тем же email, аккаунты автоматически связываются
- **Профиль пользователя**: Google OAuth автоматически заполняет имя и аватар
- **Многоязычность**: Поддержка русского, английского и казахского языков 