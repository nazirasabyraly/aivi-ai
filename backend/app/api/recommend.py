from fastapi import APIRouter, Query, Response

import requests
import os
import threading
import yt_dlp
import shutil
import subprocess
import sys


router = APIRouter()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
PROXY_URL = os.getenv("PROXY_URL")  # Формат: http://username:password@ip:port

# Простой in-memory кеш для YouTube search
youtube_search_cache = {}
youtube_search_cache_lock = threading.Lock()

AUDIO_CACHE_DIR = "audio_cache"
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)



def get_ydl_options(use_proxy=True, client_type='android_tv'):
    """Получить настройки yt-dlp с поддержкой прокси и обходом блокировок"""
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
        'quiet': True,  # Выключаем лишний вывод
        'no_warnings': True,
        'retries': 1,  # Уменьшаем количество попыток для ускорения
        'socket_timeout': 10,  # Уменьшаем таймаут
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'extractor_args': {
            'youtube': {
                'player_client': [client_type],
                'player_skip': ['configs'],
                'skip': ['dash', 'hls']
            }
        },
        'http_chunk_size': 1048576,  # Уменьшаем размер чанка
        'fragment_retries': 1,
        'retry_sleep_functions': {'http': lambda n: 1},  # Быстрые повторы
        # Дополнительные настройки для обхода блокировок
        'geo_bypass': True,
        'geo_bypass_country': 'US',
        'age_limit': None,
    }
    
    # Добавляем прокси только если запрошено и настроен
    if use_proxy and PROXY_URL:
        ydl_opts['proxy'] = PROXY_URL
        print(f"🔗 Используется прокси для {client_type}")
    else:
        print(f"🚫 Без прокси для {client_type}")
    
    return ydl_opts



# Проверка наличия yt-dlp и ffmpeg при старте backend
if shutil.which('yt-dlp') is None:
    print('❌ yt-dlp не найден! Установите: pip install yt-dlp')
else:
    try:
        version = subprocess.check_output(['yt-dlp', '--version'], text=True).strip()
        print(f'✅ yt-dlp version: {version}')
        # Попробовать обновить yt-dlp
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--upgrade', 'yt-dlp'])
            print('🔄 yt-dlp обновлён до последней версии.')
        except Exception as e:
            print(f'⚠️ Не удалось обновить yt-dlp: {e}')
    except Exception as e:
        print(f'⚠️ Не удалось получить версию yt-dlp: {e}')

if shutil.which('ffmpeg') is None:
    print('❌ ffmpeg не найден! Установите: brew install ffmpeg (macOS) или apt install ffmpeg (Linux)')
else:
    try:
        ffmpeg_version = subprocess.check_output(['ffmpeg', '-version'], text=True).split('\n')[0]
        print(f'✅ {ffmpeg_version}')
    except Exception as e:
        print(f'⚠️ Не удалось получить версию ffmpeg: {e}')

# Проверка настройки прокси
if PROXY_URL:
    print(f'🔗 Прокси настроен: {PROXY_URL[:30]}...')
else:
    print('ℹ️  Прокси не настроен (PROXY_URL не задан)')

# Здесь будут рекомендации через YouTube и аналитику лайков

@router.get("/youtube-search")
def youtube_search(q: str = Query(..., description="Поисковый запрос (название трека, артист и т.д.)"), max_results: int = 5):
    key = f"{q.lower().strip()}_{max_results}"
    with youtube_search_cache_lock:
        if key in youtube_search_cache:
            return {"results": youtube_search_cache[key]}
    if not YOUTUBE_API_KEY:
        return {"error": "YOUTUBE_API_KEY not set"}
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": q,
        "type": "video",
        "maxResults": max_results,
        "key": YOUTUBE_API_KEY
    }
    resp = requests.get(url, params=params)
    if resp.status_code != 200:
        return {"error": f"YouTube API error: {resp.text}"}
    data = resp.json()
    results = []
    for item in data.get("items", []):
        try:
            # Проверяем наличие необходимых полей
            if "id" in item and "snippet" in item:
                video_id = item["id"].get("videoId") if isinstance(item["id"], dict) else item["id"]
                if not video_id:
                    continue
                    
                snippet = item["snippet"]
                thumbnail_url = ""
                if "thumbnails" in snippet:
                    if "medium" in snippet["thumbnails"]:
                        thumbnail_url = snippet["thumbnails"]["medium"]["url"]
                    elif "default" in snippet["thumbnails"]:
                        thumbnail_url = snippet["thumbnails"]["default"]["url"]
                
                results.append({
                    "video_id": video_id,
                    "title": snippet.get("title", "Unknown title"),
                    "channel": snippet.get("channelTitle", "Unknown channel"),
                    "thumbnail": thumbnail_url
                })
        except Exception as e:
            print(f"Error processing YouTube item: {e}")
            continue
    with youtube_search_cache_lock:
        youtube_search_cache[key] = results
    return {"results": results}

@router.get("/youtube-audio")
def youtube_audio(video_id: str):
    # Сохраняем оригинальный аудиофайл (без конвертации в mp3)
    filename = None
    ext = None
    # Сначала ищем уже скачанный файл с любым расширением
    for possible_ext in ["m4a", "webm", "opus", "mp3"]:
        test_path = f"{AUDIO_CACHE_DIR}/{video_id}.{possible_ext}"
        if os.path.exists(test_path):
            filename = test_path
            ext = possible_ext
            break
    if not filename:
        # Получаем базовые настройки
        ydl_opts = get_ydl_options(use_proxy=False, client_type='android_tv')
        ydl_opts['outtmpl'] = f'{AUDIO_CACHE_DIR}/{video_id}.%(ext)s'
        
        try:
            print(f"[yt-dlp] Скачиваем https://www.youtube.com/watch?v={video_id}")
            
            # Быстрые попытки с различными настройками
            attempts = [
                # Попытка 1: Без прокси Android TV (быстро)
                get_ydl_options(use_proxy=False, client_type='android_tv'),
                # Попытка 2: Без прокси iOS (быстро)
                get_ydl_options(use_proxy=False, client_type='ios'),
                # Попытка 3: Без прокси Android Creator (быстро)
                get_ydl_options(use_proxy=False, client_type='android_creator'),
                # Попытка 4: С прокси Android TV (медленно, последняя надежда)
                get_ydl_options(use_proxy=True, client_type='android_tv'),
            ]
            
            last_error = None
            for i, attempt_opts in enumerate(attempts, 1):
                try:
                    attempt_opts['outtmpl'] = f'{AUDIO_CACHE_DIR}/{video_id}.%(ext)s'
                    client_type = attempt_opts['extractor_args']['youtube']['player_client'][0]
                    has_proxy = 'proxy' in attempt_opts
                    print(f"Попытка {i}: {client_type} {'с прокси' if has_proxy else 'без прокси'}")
                    
                    with yt_dlp.YoutubeDL(attempt_opts) as ydl:
                        result = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
                        ext = result.get('ext', 'm4a')
                        filename = f"{AUDIO_CACHE_DIR}/{video_id}.{ext}"
                        print(f"✅ Успешно скачано с попытки {i} ({client_type})")
                        break
                except Exception as e:
                    last_error = e
                    error_short = str(e)[:100]
                    print(f"❌ Попытка {i} не удалась: {error_short}...")
                    
                    # Если прокси медленный, прерываем остальные попытки с прокси
                    if "timed out" in str(e).lower() and has_proxy:
                        print("🚫 Прокси слишком медленный, пропускаем остальные попытки с прокси")
                        break
                    continue
            else:
                # Если все попытки не удались
                raise last_error
                    
        except Exception as e:
            error_msg = str(e)
            print(f"yt-dlp error for video_id={video_id}: {error_msg}")
            
            # Проверяем специфические ошибки
            if "Sign in to confirm you're not a bot" in error_msg:
                error_response = '{"error": "YouTube заблокировал доступ. Попробуйте позже или используйте другое видео."}'
            elif "Failed to extract any player response" in error_msg:
                error_response = '{"error": "YouTube временно недоступен. Попробуйте позже или используйте другое видео."}'
            elif "proxy" in error_msg.lower() or "connection" in error_msg.lower():
                if PROXY_URL:
                    print(f"⚠️ Возможная проблема с прокси: {PROXY_URL[:30]}...")
                    error_response = '{"error": "Ошибка подключения через прокси. Проверьте настройки PROXY_URL."}'
                else:
                    print("⚠️ Проблема с подключением. Рекомендуется настроить прокси.")
                    error_response = '{"error": "Ошибка подключения к YouTube. Рекомендуется настроить прокси."}'
            else:
                error_response = f'{{"error": "Не удалось загрузить аудио. YouTube может блокировать доступ."}}'
            
            import traceback
            print(traceback.format_exc())
            return Response(content=error_response, media_type="application/json", status_code=400)
    if not filename or not os.path.exists(filename):
        print(f"File not found after yt-dlp for video_id={video_id}")
        return Response(content='{"error": "Не удалось скачать аудио с YouTube. Возможно, видео недоступно."}', media_type="application/json", status_code=400)
    # Определяем mime-type по расширению
    mime_map = {
        "m4a": "audio/mp4",
        "webm": "audio/webm",
        "opus": "audio/ogg",
        "mp3": "audio/mpeg",
    }
    mime_type = mime_map.get(ext, "application/octet-stream")
    with open(filename, "rb") as f:
        audio_data = f.read()
    return Response(content=audio_data, media_type=mime_type)


