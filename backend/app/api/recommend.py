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

# +++ КОНФИГУРАЦИЯ ПРОКСИ +++
class ProxyConfig(BaseModel):
    username: str = ""
    password: str = ""
    host: str = "95.56.238.194"
    port: int = 0

# ВАШИ ДАННЫЕ ОТ ПРОКСИ (если есть)
proxy_config = ProxyConfig(
    username="ujaoszjw", # ВАШ ЛОГИН
    password="573z5xhtgbci", # ВАШ ПАРОЛЬ
    port=80,      # ВАШ ПОРТ
)
# ++++++++++++++++++++++++++++

recommend_router = APIRouter()
auth_service = AuthService()

AUDIO_CACHE_DIR = "audio_cache"
if not os.path.exists(AUDIO_CACHE_DIR):
    os.makedirs(AUDIO_CACHE_DIR)

def _get_yt_dlp_options(proxy: str = None):
    """Возвращает базовые, быстрые опции для yt-dlp."""
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'outtmpl': os.path.join(AUDIO_CACHE_DIR, '%(id)s.%(ext)s'),
        'nocheckcertificate': True,
        'quiet': True,
        'no_warnings': True,
        'extract_audio': True,
        'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'm4a'}],
        'logger': log,
        # Агрессивные таймауты и отказ от внутренних ретраев
        'retries': 0,
        'fragment_retries': 0,
    }
    if proxy:
        ydl_opts['proxy'] = proxy
        # Устанавливаем короткий таймаут специально для прокси
        ydl_opts['socket_timeout'] = 10
    else:
        # Для прямого соединения можем позволить таймаут чуть больше
        ydl_opts['socket_timeout'] = 20

    return ydl_opts

def _download_video(video_url: str, video_id: str, proxy: str | None):
    """Одна попытка скачать видео с заданными опциями."""
    log.info(f"Downloading {video_id} with proxy: {'Yes' if proxy else 'No'}")
    ydl_opts = _get_yt_dlp_options(proxy=proxy)
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(video_url, download=True)
        filename = ydl.prepare_filename(info_dict)
        base, _ = os.path.splitext(filename)
        final_filename = f"{base}.m4a"
        if os.path.exists(final_filename):
            log.info(f"✅ Download successful: {final_filename}")
            return final_filename
        else:
            raise DownloadError(f"File not created for {video_id}")

def _download_with_retries(video_url: str, video_id: str):
    """Сначала быстрая попытка с прокси, если не удалась - напрямую."""
    proxy_url = None
    if proxy_config.username and proxy_config.password and proxy_config.port > 0:
        # --- ДОБАВЛЯЕМ ГЕНЕРАЦИЮ УНИКАЛЬНОЙ СЕССИИ ---
        session_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        proxy_username = f"{proxy_config.username}-session-{session_id}"
        proxy_url = f"http://{proxy_username}:{proxy_config.password}@{proxy_config.host}:{proxy_config.port}"
        # ---------------------------------------------

    # Попытка 1: С прокси (если настроен)
    if proxy_url:
        try:
            log.info(f"Attempting download with proxy for {video_id}...")
            return _download_video(video_url, video_id, proxy=proxy_url)
        except Exception as e:
            # Логируем, что прокси не сработал, и ПРОДОЛЖАЕМ, а не падаем
            log.warning(f"⚠️ Proxy download failed for {video_id}. Error: {e}. Trying direct connection...")

    # Попытка 2: Напрямую (если прокси не настроен или не сработал)
    try:
        log.info(f"Attempting download with direct connection for {video_id}...")
        return _download_video(video_url, video_id, proxy=None)
    except Exception as e:
        log.error(f"❌ Direct download also failed for {video_id}. Giving up. Error: {e}")
        # Если и прямое соединение не удалось - тогда уже возвращаем ошибку
        raise e

@recommend_router.get("/youtube-audio")
async def get_youtube_audio(video_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Скачивает и отдает аудио с YouTube."""
    if not shutil.which('ffmpeg'):
        log.error("❌ FFMPEG NOT FOUND.", extra={"video_id": video_id})
        raise HTTPException(status_code=503, detail="Server is not configured for audio processing.")

    cached_path = next((p for p in [os.path.join(AUDIO_CACHE_DIR, f"{video_id}.{ext}") for ext in ['m4a', 'mp3', 'webm']] if os.path.exists(p)), None)
    if cached_path:
        log.info(f"✅ Audio found in cache: {cached_path}", extra={"video_id": video_id})
        return FileResponse(cached_path, media_type="audio/mp4")

    try:
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        audio_path = _download_with_retries(video_url, video_id)

        if not audio_path or not os.path.exists(audio_path):
            raise HTTPException(status_code=500, detail="Failed to download audio after all attempts.")

        def iterfile():
            with open(audio_path, mode="rb") as file_like:
                yield from file_like

        return StreamingResponse(iterfile(), media_type="audio/mp4")
    except Exception as e:
        log.error(f"❌ CRITICAL ERROR in get_youtube_audio: {e}", extra={"video_id": video_id})
        raise HTTPException(status_code=500, detail=f"Failed to process audio: {str(e)}")


@recommend_router.get("/youtube-search")
async def search_youtube(q: str, max_results: int = 5):
    """Поиск видео на YouTube."""
    ydl_opts = {
        'format': 'bestaudio',
        'noplaylist': True,
        'default_search': 'ytsearch',
        'quiet': True,
        'no_warnings': True,
    }
    try:
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