from fastapi import APIRouter, Query, Response
from typing import List
import requests
import os
import threading
import yt_dlp
import shutil
import subprocess
import sys

router = APIRouter()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# Простой in-memory кеш для YouTube search
youtube_search_cache = {}
youtube_search_cache_lock = threading.Lock()

AUDIO_CACHE_DIR = "audio_cache"
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

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
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': f'{AUDIO_CACHE_DIR}/{video_id}.%(ext)s',
            'quiet': True,
            'no_warnings': True,
            # Попытка обойти блокировку YouTube
            'age_limit': None,
            'skip_download': False,
            'writesubtitles': False,
            'writeautomaticsub': False,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'extractor_args': {
                'youtube': {
                    'player_client': ['web', 'android', 'ios', 'tv'],
                    'player_skip': ['configs', 'webpage'],
                    'skip': ['dash', 'hls']
                }
            },
            'headers': {
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none'
            }
        }
        try:
            print(f"[yt-dlp] Скачиваем https://www.youtube.com/watch?v={video_id}")
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=True)
                ext = result.get('ext', 'm4a')
                filename = f"{AUDIO_CACHE_DIR}/{video_id}.{ext}"
        except Exception as e:
            print(f"yt-dlp error for video_id={video_id}: {e}")
            import traceback
            print(traceback.format_exc())
            return Response(content=f'{{"error": "yt-dlp error: {str(e)}"}}', media_type="application/json", status_code=400)
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
