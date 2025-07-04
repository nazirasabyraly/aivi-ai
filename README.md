# VibeMatch

VibeMatch — современное веб-приложение для анализа медиа и музыкальных рекомендаций на основе AI и YouTube.

## Основные фичи
- Регистрация и вход по email и паролю
- Анализ настроения загруженных медиа (фото/видео) через OpenAI
- Музыкальные рекомендации по настроению (YouTube Data API)
- Воспроизведение музыки через YouTube embed и mp3 (безлимитно)
- Кеширование аудио на сервере (mp3)
- Лайк/сохранение треков в избранное
- Персональные рекомендации на основе избранного
- AI-чат с поддержкой анализа медиа и рекомендаций
- Интернационализация (русский, английский, казахский)
- Современный UI, адаптивность

## Архитектура
- **Backend:** FastAPI, PostgreSQL, OpenAI API, YouTube Data API, yt-dlp (mp3)
- **Frontend:** React, TypeScript, i18next, YouTube iFrame API

## Быстрый старт
1. Клонируйте репозиторий
2. Запустите `setup_env.sh` и введите OpenAI API Key, frontend URL
3. Запустите приложение: `./start_app_improved.sh`

## Переменные окружения
- `OPENAI_API_KEY` — ключ OpenAI
- `FRONTEND_URL` — URL фронтенда (ngrok или localhost)
- `RIFFUSION_API_KEY` — ключ Riffusion API

## Примечания
- Вся логика Spotify/Deezer/Last.fm полностью удалена
- Квота YouTube Data API минимизируется за счёт кеша
- Для проигрывания mp3 используется yt-dlp (безлимитно)

## Контакты
- Telegram: @yourusername

## Генерация музыки через Riffusion

- Для генерации музыки используется [Riffusion API](https://riffusionapi.com/).
- Необходимо получить API-ключ и добавить его в переменные окружения:

```
RIFFUSION_API_KEY=ваш_ключ
```

- Новый эндпоинт:
  - `POST /chat/generate-beat` — принимает строку prompt, возвращает ссылку на mp3-файл.

---

VibeMatch — AI-powered music and media recommendations, no Spotify required! 