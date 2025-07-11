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

recommend_router = APIRouter()
auth_service = AuthService()

AUDIO_CACHE_DIR = "audio_cache"
if not os.path.exists(AUDIO_CACHE_DIR):
    os.makedirs(AUDIO_CACHE_DIR)

def _get_robust_yt_dlp_options():
    """Возвращает максимально совместимые опции для yt-dlp."""
    return {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(AUDIO_CACHE_DIR, '%(id)s.%(ext)s'),
        'noplaylist': True,
        'no_warnings': True,
        'quiet': True,
        'extract_audio': True,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'm4a',
            'preferredquality': '192',
        }],
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        'extractor_args': {
            'youtube': {
                'player_client': ['web'],
                'skip': ['dash', 'hls']
            }
        },
        'socket_timeout': 30,
        'retries': 3,
        'ignoreerrors': True,
        'no_check_certificate': True,
    }

def _download_youtube_audio(video_id: str) -> str:
    """Скачивает аудио с YouTube с максимальной совместимостью."""
    log.info(f"🎵 Starting download for {video_id}")
    
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    # Проверяем разные форматы файлов в кеше
    for ext in ['m4a', 'mp3', 'webm', 'mp4']:
        cached_file = os.path.join(AUDIO_CACHE_DIR, f"{video_id}.{ext}")
        if os.path.exists(cached_file):
            log.info(f"✅ Found cached file: {cached_file}")
            return cached_file
    
    # Пробуем скачать с разными стратегиями
    strategies = [
        # Стратегия 1: Базовая
        {
            'name': 'basic',
            'options': _get_robust_yt_dlp_options()
        },
        # Стратегия 2: Только web клиент
        {
            'name': 'web_only',
            'options': {
                **_get_robust_yt_dlp_options(),
                'extractor_args': {
                    'youtube': {
                        'player_client': ['web'],
                        'skip': ['dash', 'hls', 'translated_subs']
                    }
                }
            }
        },
        # Стратегия 3: Минимальная конфигурация
        {
            'name': 'minimal',
            'options': {
                'format': 'worst[ext=mp4]/worst',
                'outtmpl': os.path.join(AUDIO_CACHE_DIR, '%(id)s.%(ext)s'),
                'noplaylist': True,
                'quiet': True,
                'no_warnings': True,
                'socket_timeout': 15,
                'retries': 1,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                }
            }
        }
    ]
    
    for strategy in strategies:
        try:
            log.info(f"🔄 Trying strategy: {strategy['name']}")
            
            # Добавляем случайную задержку
            time.sleep(random.uniform(2, 5))
            
            with yt_dlp.YoutubeDL(strategy['options']) as ydl:
                try:
                    # Пробуем скачать
                    ydl.download([video_url])
                    
                    # Ищем скачанный файл
                    for ext in ['m4a', 'mp3', 'webm', 'mp4']:
                        downloaded_file = os.path.join(AUDIO_CACHE_DIR, f"{video_id}.{ext}")
                        if os.path.exists(downloaded_file):
                            log.info(f"✅ Successfully downloaded: {downloaded_file}")
                            return downloaded_file
                    
                    log.warning(f"⚠️ Strategy {strategy['name']} completed but no file found")
                    
                except Exception as e:
                    log.warning(f"⚠️ Strategy {strategy['name']} failed: {str(e)}")
                    continue
                    
        except Exception as e:
            log.warning(f"⚠️ Strategy {strategy['name']} error: {str(e)}")
            continue
    
    # Если все стратегии не сработали
    log.error(f"❌ All download strategies failed for {video_id}")
    raise HTTPException(
        status_code=503, 
        detail="Unable to download audio at this time. Please try again later."
    )

@recommend_router.get("/youtube-audio")
async def get_youtube_audio(video_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Скачивает и отдает аудио с YouTube."""
    if not shutil.which('ffmpeg'):
        log.error("❌ FFMPEG NOT FOUND.")
        raise HTTPException(status_code=503, detail="Server is not configured for audio processing.")

    try:
        audio_path = _download_youtube_audio(video_id)
        
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=500, detail="Audio file not found after download.")

        def iterfile():
            with open(audio_path, mode="rb") as file_like:
                yield from file_like

        return StreamingResponse(iterfile(), media_type="audio/mp4")
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"❌ Critical error in get_youtube_audio: {e}")
        raise HTTPException(status_code=500, detail="Failed to process audio request.")

@recommend_router.get("/youtube-search")
async def search_youtube(q: str, max_results: int = 5):
    """Поиск видео на YouTube."""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'default_search': 'ytsearch',
            'socket_timeout': 15,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            search_results = ydl.extract_info(f"ytsearch{max_results}:{q}", download=False)
            videos = []
            
            if search_results and 'entries' in search_results:
                for entry in search_results['entries']:
                    if entry:  # Проверяем что entry не None
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
        log.error(f"Error searching YouTube: {e}")
        raise HTTPException(status_code=500, detail="Failed to search YouTube") 