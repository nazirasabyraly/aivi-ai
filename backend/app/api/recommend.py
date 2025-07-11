import os
import shutil
import subprocess
import time
import logging
import random
import string
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
import yt_dlp
from yt_dlp.utils import ExtractorError, DownloadError
from pydantic import BaseModel

from ..dependencies import get_current_user
from ..models.user import User
from ..database import get_db
from ..services.auth_service import AuthService

log = logging.getLogger(__name__)

# Конфигурация прокси для обхода блокировок YouTube
class ProxyConfig:
    def __init__(self):
        # Webshare прокси настройки (правильный формат для Webshare)
        self.proxy_username = "ujaoszjw"
        self.proxy_password = "573z5xhtgbci"
        self.proxy_host = "p.webshare.io"
        self.proxy_port = 80
        
        # Правильный формат для Webshare - без дополнительных суффиксов
        self.base_proxy = f"http://{self.proxy_username}:{self.proxy_password}@{self.proxy_host}:{self.proxy_port}"
        
        # Список прокси для ротации (используем базовый формат)
        self.proxy_endpoints = [
            self.base_proxy,
            f"http://{self.proxy_username}:{self.proxy_password}@{self.proxy_host}:{self.proxy_port}",
        ]
        
        # Альтернативные порты Webshare
        self.alternative_endpoints = [
            f"http://{self.proxy_username}:{self.proxy_password}@{self.proxy_host}:8080",
            f"http://{self.proxy_username}:{self.proxy_password}@{self.proxy_host}:8000",
        ]
        
        # Все доступные прокси
        self.all_proxies = self.proxy_endpoints + self.alternative_endpoints

proxy_config = ProxyConfig()

recommend_router = APIRouter()
auth_service = AuthService()

AUDIO_CACHE_DIR = "audio_cache"
if not os.path.exists(AUDIO_CACHE_DIR):
    os.makedirs(AUDIO_CACHE_DIR)

def _get_yt_dlp_options(proxy_url: str = None):
    """Возвращает опции для yt-dlp с защитой от бот-детекции и прокси."""
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'outtmpl': os.path.join(AUDIO_CACHE_DIR, '%(id)s.%(ext)s'),
        'nocheckcertificate': True,
        'quiet': True,
        'no_warnings': True,
        'extract_audio': True,
        'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'm4a'}],
        'logger': log,
        'retries': 2,
        'fragment_retries': 2,
        'socket_timeout': 45 if not proxy_url else 25,
        'geo_bypass': True,
        'geo_bypass_country': 'US',
        # Агрессивная защита от детекции ботов
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        },
        # Продвинутые опции для обхода защиты YouTube
        'extractor_args': {
            'youtube': {
                'skip': ['dash', 'hls'],
                'player_client': ['android', 'web', 'ios', 'mweb'],
                'player_skip': ['configs'],
                'include_live_dash': False,
                'include_dash_manifest': False,
                'include_hls_manifest': False,
            }
        },
        # Дополнительные опции для стабильности
        'no_check_certificate': True,
        'prefer_insecure': False,
        'ignoreerrors': False,
        'abort_on_unavailable_fragment': False,
        'keep_fragments': False,
        'buffersize': 1024,
        'http_chunk_size': 1024,
        'playlist_items': '1',
        'noplaylist': True,
        'writesubtitles': False,
        'writeautomaticsub': False,
        'allsubtitles': False,
        'listsubtitles': False,
        'subtitlesformat': 'best',
        'subtitleslangs': ['en'],
        'ignoreerrors': True,
        'no_color': True,
        'call_home': False,
        'sleep_interval': 1,
        'max_sleep_interval': 3,
        'sleep_interval_requests': 1,
        'sleep_interval_subtitles': 1,
    }
    
    if proxy_url:
        ydl_opts['proxy'] = proxy_url
        # Для прокси используем более короткие таймауты
        ydl_opts['socket_timeout'] = 20
        ydl_opts['retries'] = 1
        ydl_opts['fragment_retries'] = 1
        log.info(f"🔗 Using proxy: {proxy_url.split('@')[0].split('://')[-1]}@***")
    
    return ydl_opts

def _download_video_with_proxy(video_url: str, video_id: str, proxy_url: str):
    """Скачивает видео с использованием прокси."""
    log.info(f"📡 Downloading {video_id} with proxy...")
    
    # Добавляем случайную задержку для имитации человеческого поведения
    delay = random.uniform(2, 5)
    time.sleep(delay)
    
    ydl_opts = _get_yt_dlp_options(proxy_url=proxy_url)
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Сначала пробуем получить информацию о видео
            info_dict = ydl.extract_info(video_url, download=False)
            if not info_dict:
                raise DownloadError(f"Could not extract video info for {video_id}")
            
            # Проверяем, доступно ли видео
            if info_dict.get('availability') == 'private':
                raise DownloadError(f"Video {video_id} is private")
            
            # Теперь скачиваем
            info_dict = ydl.extract_info(video_url, download=True)
            filename = ydl.prepare_filename(info_dict)
            base, _ = os.path.splitext(filename)
            final_filename = f"{base}.m4a"
            
            if os.path.exists(final_filename):
                log.info(f"✅ Proxy download successful: {final_filename}")
                return final_filename
            else:
                raise DownloadError(f"File not created for {video_id}")
                
    except Exception as e:
        log.warning(f"❌ Proxy download failed for {video_id}: {str(e)}")
        raise e

def _download_video_direct(video_url: str, video_id: str):
    """Скачивает видео без прокси."""
    log.info(f"🔄 Downloading {video_id} directly...")
    
    # Добавляем случайную задержку
    delay = random.uniform(3, 6)
    time.sleep(delay)
    
    ydl_opts = _get_yt_dlp_options()
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Сначала пробуем получить информацию о видео
            info_dict = ydl.extract_info(video_url, download=False)
            if not info_dict:
                raise DownloadError(f"Could not extract video info for {video_id}")
            
            # Проверяем, доступно ли видео
            if info_dict.get('availability') == 'private':
                raise DownloadError(f"Video {video_id} is private")
            
            # Теперь скачиваем
            info_dict = ydl.extract_info(video_url, download=True)
            filename = ydl.prepare_filename(info_dict)
            base, _ = os.path.splitext(filename)
            final_filename = f"{base}.m4a"
            
            if os.path.exists(final_filename):
                log.info(f"✅ Direct download successful: {final_filename}")
                return final_filename
            else:
                raise DownloadError(f"File not created for {video_id}")
                
    except Exception as e:
        log.warning(f"❌ Direct download failed for {video_id}: {str(e)}")
        raise e

def _test_proxy(proxy_url: str) -> bool:
    """Тестирует прокси соединение."""
    try:
        import requests
        response = requests.get(
            'https://httpbin.org/ip',
            proxies={'http': proxy_url, 'https': proxy_url},
            timeout=10
        )
        if response.status_code == 200:
            log.info(f"✅ Proxy test successful: {proxy_url.split('@')[0].split('://')[-1]}@***")
            return True
        else:
            log.warning(f"❌ Proxy test failed with status {response.status_code}")
            return False
    except Exception as e:
        log.warning(f"❌ Proxy test failed: {str(e)}")
        return False

def _download_with_fallback(video_url: str, video_id: str):
    """Пробует скачать с рабочими прокси, затем напрямую."""
    
    # Сначала тестируем прокси и используем только рабочие
    working_proxies = []
    for proxy_url in proxy_config.all_proxies:
        if _test_proxy(proxy_url):
            working_proxies.append(proxy_url)
    
    if working_proxies:
        log.info(f"🔄 Found {len(working_proxies)} working proxies")
        random.shuffle(working_proxies)
        
        # Стратегия 1: Пробуем рабочие прокси
        for i, proxy_url in enumerate(working_proxies):
            try:
                log.info(f"🔄 Attempt {i+1}/{len(working_proxies)}: Using tested proxy")
                return _download_video_with_proxy(video_url, video_id, proxy_url)
            except Exception as e:
                error_msg = str(e).lower()
                log.warning(f"⚠️ Proxy attempt {i+1} failed: {str(e)[:100]}...")
                
                # Если это ошибка бот-детекции, ждем и пробуем следующий
                if "sign in to confirm" in error_msg or "bot" in error_msg:
                    if i < len(working_proxies) - 1:
                        wait_time = random.uniform(3, 7)
                        log.info(f"⏳ Bot detection, waiting {wait_time:.1f}s...")
                        time.sleep(wait_time)
                        continue
                else:
                    continue
    else:
        log.warning("⚠️ No working proxies found, going directly to fallback")
    
    # Стратегия 2: Пробуем без прокси
    try:
        log.info("🔄 Trying direct connection...")
        time.sleep(random.uniform(5, 10))
        return _download_video_direct(video_url, video_id)
    except Exception as e:
        log.error(f"❌ Direct connection failed: {str(e)}")
        
        # Определяем тип ошибки
        error_msg = str(e).lower()
        if "sign in to confirm" in error_msg or "bot" in error_msg:
            raise HTTPException(
                status_code=503, 
                detail="YouTube has blocked all our connections. Please try again later."
            )
        elif "unavailable" in error_msg or "private" in error_msg:
            raise HTTPException(
                status_code=404, 
                detail="This video is not available."
            )
        else:
            raise HTTPException(
                status_code=500, 
                detail="Failed to download video after all attempts."
            )

@recommend_router.get("/youtube-audio")
async def get_youtube_audio(video_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Скачивает и отдает аудио с YouTube с использованием прокси для обхода блокировок."""
    if not shutil.which('ffmpeg'):
        log.error("❌ FFMPEG NOT FOUND.", extra={"video_id": video_id})
        raise HTTPException(status_code=503, detail="Server is not configured for audio processing.")

    # Проверяем кеш
    cached_path = None
    for ext in ['m4a', 'mp3', 'webm']:
        potential_path = os.path.join(AUDIO_CACHE_DIR, f"{video_id}.{ext}")
        if os.path.exists(potential_path):
            cached_path = potential_path
            break
    
    if cached_path:
        log.info(f"✅ Audio found in cache: {cached_path}", extra={"video_id": video_id})
        return FileResponse(cached_path, media_type="audio/mp4")

    try:
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        audio_path = _download_with_fallback(video_url, video_id)

        if not audio_path or not os.path.exists(audio_path):
            raise HTTPException(status_code=500, detail="Failed to download audio.")

        def iterfile():
            with open(audio_path, mode="rb") as file_like:
                yield from file_like

        return StreamingResponse(iterfile(), media_type="audio/mp4")
        
    except HTTPException:
        # Пробрасываем HTTP исключения как есть
        raise
    except Exception as e:
        log.error(f"❌ CRITICAL ERROR in get_youtube_audio: {e}", extra={"video_id": video_id})
        raise HTTPException(status_code=500, detail=f"Failed to process audio: {str(e)}")


@recommend_router.get("/youtube-search")
async def search_youtube(q: str, max_results: int = 5):
    """Поиск видео на YouTube с использованием прокси."""
    
    # Пробуем с прокси сначала
    for proxy_url in proxy_config.all_proxies:
        try:
            ydl_opts = {
                'format': 'bestaudio',
                'noplaylist': True,
                'default_search': 'ytsearch',
                'quiet': True,
                'no_warnings': True,
                'proxy': proxy_url,
                'socket_timeout': 15,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                search_results = ydl.extract_info(f"ytsearch{max_results}:{q}", download=False)
                videos = []
                if 'entries' in search_results:
                    for entry in search_results['entries']:
                        videos.append({
                            "video_id": entry.get("id"),
                            "title": entry.get("title"),
                            "description": entry.get("description"),
                            "thumbnail": entry.get("thumbnail"),
                            "channel_title": entry.get("channel"),
                            "duration": entry.get("duration"),
                        })
                return {"results": videos}
                
        except Exception as e:
            log.warning(f"Search with proxy failed: {e}")
            continue
    
    # Fallback без прокси
    try:
        ydl_opts = {
            'format': 'bestaudio',
            'noplaylist': True,
            'default_search': 'ytsearch',
            'quiet': True,
            'no_warnings': True,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            search_results = ydl.extract_info(f"ytsearch{max_results}:{q}", download=False)
            videos = []
            if 'entries' in search_results:
                for entry in search_results['entries']:
                    videos.append({
                        "video_id": entry.get("id"),
                        "title": entry.get("title"),
                        "description": entry.get("description"),
                        "thumbnail": entry.get("thumbnail"),
                        "channel_title": entry.get("channel"),
                        "duration": entry.get("duration"),
                    })
            return {"results": videos}
            
    except Exception as e:
        log.error(f"Error searching youtube: {e}")
        raise HTTPException(status_code=500, detail="Failed to search YouTube") 