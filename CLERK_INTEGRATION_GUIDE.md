# Руководство по интеграции Clerk

## ✅ Что уже сделано

1. **Установлены зависимости:**
   - `@clerk/clerk-react` в frontend
   - `PyJWT` в backend

2. **Настроена структура:**
   - ClerkProvider обертывает приложение
   - Создан ClerkAuth компонент
   - Настроена валидация токенов в backend
   - Добавлено поле clerk_id в модель User

3. **Интеграция с существующей системой:**
   - Clerk работает параллельно с Google OAuth
   - Пользователи могут авторизоваться через Clerk или Google
   - Токены валидируются автоматически

## 🔧 Настройка переменных окружения

### Frontend (.env.local)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### Backend (.env)
```bash
CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
```

## 🚀 Как использовать

### 1. Получение ключей Clerk

1. Перейдите на https://clerk.com/
2. Создайте аккаунт и новое приложение
3. В разделе "API Keys" скопируйте:
   - Publishable Key (начинается с `pk_test_`)
   - Secret Key (начинается с `sk_test_`)

### 2. Настройка Clerk Dashboard

1. **Email Settings:**
   - Включите "Email address" как обязательное поле
   - Включите "Email verification"

2. **Domains:**
   - Добавьте `http://localhost:3000` для разработки
   - Добавьте ваш production домен

3. **Appearance (опционально):**
   - Настройте брендинг под ваш проект

### 3. Запуск приложения

```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Frontend
cd frontend
npm run dev
```

## 📋 Как это работает

### Процесс аутентификации:

1. **Пользователь выбирает метод входа:**
   - Clerk (Email с верификацией)
   - Google OAuth
   - Старый email (отключен по умолчанию)

2. **Clerk аутентификация:**
   - Пользователь регистрируется/входит через Clerk
   - Clerk автоматически отправляет email верификацию
   - После подтверждения email, пользователь получает JWT токен

3. **Backend обработка:**
   - Токен проверяется через Clerk JWKS
   - Создается/обновляется пользователь в базе данных
   - Пользователь получает доступ к защищенным эндпоинтам

### Структура данных:

```sql
-- Таблица users теперь поддерживает:
users (
  id INTEGER PRIMARY KEY,
  email VARCHAR UNIQUE,
  username VARCHAR UNIQUE,
  hashed_password VARCHAR NULL,  -- NULL для OAuth пользователей
  google_id VARCHAR NULL,        -- Для Google OAuth
  clerk_id VARCHAR NULL,         -- Для Clerk
  provider VARCHAR DEFAULT 'email',  -- 'email', 'google', 'clerk'
  is_verified BOOLEAN DEFAULT FALSE,
  -- ... другие поля
)
```

## 🔒 Безопасность

- Clerk токены проверяются через JWKS (JSON Web Key Set)
- Поддерживается автоматическое обновление ключей
- Токены имеют срок действия
- Email верификация обязательна

## 🎨 Настройка внешнего вида

Компонент `ClerkAuth` поддерживает кастомизацию:

```tsx
const appearance = {
  elements: {
    formButtonPrimary: 'custom-button-class',
    card: 'custom-card-class',
    // ... другие элементы
  },
  variables: {
    colorPrimary: '#667eea',
    colorBackground: '#ffffff',
    // ... другие переменные
  }
}
```

## 🐛 Отладка

### Проблемы с токенами:
```bash
# Проверьте логи backend
tail -f backend/logs/app.log

# Проверьте настройки Clerk
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8001/auth/verify
```

### Проблемы с JWKS:
- Убедитесь, что CLERK_PUBLISHABLE_KEY правильный
- Проверьте доступность https://api.clerk.com/v1/jwks

## 📝 Дополнительные возможности

### Webhook поддержка (опционально):
Clerk может отправлять webhook при изменении пользователя:

```python
@router.post("/clerk/webhook")
async def clerk_webhook(request: Request):
    # Обработка webhook от Clerk
    pass
```

### Middleware для автоматической синхронизации:
```python
# Автоматическое обновление данных пользователя
@app.middleware("http")
async def sync_clerk_user(request: Request, call_next):
    # Синхронизация данных с Clerk
    pass
```

## ✨ Преимущества интеграции

1. **Автоматическая email верификация** - Clerk сам отправляет и проверяет email
2. **Готовые UI компоненты** - Красивые формы входа/регистрации
3. **Безопасность** - Проверенные алгоритмы и практики
4. **Масштабируемость** - Поддержка больших нагрузок
5. **Совместимость** - Работает с существующей системой

## 🔄 Миграция существующих пользователей

Существующие пользователи (Google OAuth, старый email) продолжают работать:
- Google пользователи: `provider = 'google'`
- Clerk пользователи: `provider = 'clerk'`
- Старые email пользователи: `provider = 'email'`

Пользователи могут связать аккаунты через один email. 