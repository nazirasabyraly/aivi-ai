from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status, Form, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from typing import Dict, Any, List
import json
import uuid
import time
import aiohttp
from ..services.openai_service import OpenAIService
from ..config import MAX_FILE_SIZE, ALLOWED_EXTENSIONS
from ..dependencies import get_current_user
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import SavedSong, User, ChatMessage
from ..schemas import ChatMessageCreate, ChatMessageOut, GenerateBeatRequest, GenerateBeatResponse, GenerateBeatStatusRequest, RecommendationsRequest
import asyncio
import os
import requests

router = APIRouter(tags=["chat"])

# Инициализируем сервисы
openai_service = OpenAIService()

AUDIO_CACHE_DIR = "audio_cache"
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

@router.post("/analyze-media")
async def analyze_media(
    file: UploadFile = File(...),
    user_id: str = Form(None),
    language: str = Form("ru"),  # Получаем язык из FormData
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Анализирует загруженный медиафайл и возвращает анализ настроения
    """
    try:
        # Проверяем лимиты использования
        from ..services.auth_service import AuthService
        auth_service = AuthService()
        auth_service.check_usage_limit(db, current_user)
        
        print(f"🔍 Получен файл: {file.filename}, размер: {file.size}, тип: {file.content_type}, язык: {language}")
        
        # Проверяем размер файла
        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Файл слишком большой (максимум 10MB)")
        
        # Проверяем расширение файла
        if file.filename:
            file_ext = '.' + file.filename.split('.')[-1].lower()
            print(f"📁 Расширение файла: {file_ext}")
            print(f"✅ Разрешенные расширения: {ALLOWED_EXTENSIONS}")
            
            if file_ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Неподдерживаемый тип файла. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}"
                )
        
        print("🚀 Начинаем анализ медиафайла...")
        
        # Анализируем медиафайл с учетом языка
        analysis = await openai_service.analyze_media_mood(file, language=language)
        
        print(f"📊 Результат анализа: {analysis}")
        
        if "error" in analysis:
            raise HTTPException(status_code=500, detail=analysis["error"])
        
        return JSONResponse(content=analysis)
        
    except Exception as e:
        print(f"❌ Ошибка в analyze_media: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка анализа файла: {str(e)}")

@router.post("/get-recommendations")
async def get_music_recommendations(
    mood_analysis: Dict[str, Any],
    language: str = "ru",  # Добавляем параметр языка
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получает две подборки: 5 персональных (по saved_songs) и 5 глобальных (по mood_analysis)
    """
    try:
        global_prefs = {
            "top_genres": ["pop", "electronic", "indie"],
            "top_artists": ["The Weeknd", "Dua Lipa", "Post Malone"],
            "top_tracks": ["Blinding Lights", "Levitating", "Circles"]
        }
        saved_songs = db.query(SavedSong).filter(SavedSong.user_id == current_user.id).all()
        personal_prefs = {
            "top_genres": [],
            "top_artists": list({s.artist for s in saved_songs if s.artist}),
            "top_tracks": list({s.title for s in saved_songs if s.title})
        } if saved_songs else global_prefs
        print(f"[RECOMMEND] mood_analysis: {mood_analysis}, language: {language}")
        print(f"[RECOMMEND] personal_prefs: {personal_prefs}")
        try:
            print("[RECOMMEND] Запрашиваем рекомендации у OpenAI...")
            global_task = openai_service.get_music_recommendations(mood_analysis, global_prefs, n_tracks=5, language=language)
            personal_task = openai_service.get_music_recommendations(mood_analysis, personal_prefs, n_tracks=5, language=language)
            global_rec, personal_rec = await asyncio.wait_for(
                asyncio.gather(global_task, personal_task), timeout=60.0
            )
            print(f"[RECOMMEND] Ответ OpenAI: global={global_rec}, personal={personal_rec}")
            return JSONResponse(content={
                "global": global_rec["recommendations"],
                "personal": personal_rec["recommendations"],
                "ask_feedback": True
            })
        except asyncio.TimeoutError:
            print("[RECOMMEND] Timeout от OpenAI! Возвращаем ошибку.")
            raise HTTPException(status_code=500, detail="OpenAI API не отвечает. Попробуйте позже.")
        except Exception as e:
            print(f"[RECOMMEND] Ошибка OpenAI: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка получения рекомендаций от OpenAI: {str(e)}")
    except Exception as e:
        print(f"[RECOMMEND] Ошибка получения рекомендаций: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения рекомендаций: {str(e)}")

@router.post("/chat")
async def chat_with_ai(
    message: str,
    mood_analysis: Dict[str, Any] = None,
    user_id: str = None
):
    """
    Общий чат с ИИ для обсуждения музыки и настроения
    """
    try:
        # Формируем контекст для ИИ
        context = f"""
        Ты музыкальный эксперт и помощник по подбору музыки. 
        Пользователь написал: "{message}"
        """
        
        if mood_analysis:
            context += f"""
            Контекст анализа настроения:
            - Настроение: {mood_analysis.get('mood', 'neutral')}
            - Описание: {mood_analysis.get('description', '')}
            - Эмоции: {mood_analysis.get('emotions', [])}
            """
        
        context += """
        Ответь дружелюбно и помоги пользователю с музыкальными рекомендациями.
        Можешь предложить жанры, исполнителей или обсудить музыкальные предпочтения.
        """
        
        # Выбираем модель в зависимости от провайдера
        if openai_service.use_azure:
            model = openai_service.deployment_name
        else:
            model = "gpt-4"
        
        # Получаем ответ от ИИ
        response = openai_service.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Ты дружелюбный музыкальный эксперт, который помогает людям находить музыку по настроению."},
                {"role": "user", "content": context}
            ],
            max_tokens=300
        )
        
        ai_response = response.choices[0].message.content
        
        return JSONResponse(content={
            "success": True,
            "response": ai_response,
            "message": message
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка чата: {str(e)}")

@router.get("/supported-formats")
async def get_supported_formats():
    """
    Возвращает поддерживаемые форматы файлов
    """
    return JSONResponse(content={
        "supported_formats": list(ALLOWED_EXTENSIONS),
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024)
    })

@router.get('/history', response_model=List[ChatMessageOut])
def get_chat_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).order_by(ChatMessage.timestamp).all()

@router.post('/history', response_model=ChatMessageOut)
def add_chat_message(msg: ChatMessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_msg = ChatMessage(user_id=current_user.id, **msg.dict())
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

@router.delete('/history', status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).delete()
    db.commit()
    return None

async def _run_riffusion_generation(prompt: str, request_id: str):
    """
    Фоновая задача для генерации и скачивания музыки.
    """
    try:
        print(f"🎵 [BG] Starting generation for request_id: {request_id}, prompt: {prompt}")
        
        RIFFUSION_API_KEY = os.getenv("RIFFUSION_API_KEY")
        if not RIFFUSION_API_KEY:
            print("❌ RIFFUSION_API_KEY не задан для фоновой задачи")
            with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
                f.write("Server not configured for music generation.")
            return

        # --- 1. Отправка запроса на генерацию ---
        url = "https://riffusionapi.com/api/generate-music"
        headers = {
            "accept": "application/json",
            "x-api-key": RIFFUSION_API_KEY,
            "Content-Type": "application/json"
        }
        data = {"prompt": prompt}

        print(f"🎵 [BG] Sending initial request to Riffusion API...")
        response = requests.post(url, headers=headers, json=data, timeout=30)
        print(f"🎵 [BG] Initial response status: {response.status_code}")
        print(f"🎵 [BG] Initial response body: {response.text}")
        
        if response.status_code != 200:
            error_text = response.text
            print(f"❌ [BG] API Error: {error_text}")
            with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
                f.write(f"API Error: {error_text}")
            return
            
        initial_result = response.json()
        print(f"🎵 [BG] Initial response: {initial_result}")
        
        # Get the task ID from the response
        riffusion_request_id = initial_result.get("request_id")
        if not riffusion_request_id:
            print("❌ [BG] No request_id in response")
            with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
                f.write("Failed to get request_id from API")
            return

        # --- 2. Ожидание завершения генерации (Polling) ---
        status_url = "https://riffusionapi.com/api/generate-music"
        status_data = {"request_id": riffusion_request_id}
        start_time = time.time()
        max_wait_time = 300  # 5 minutes timeout
        
        while time.time() - start_time < max_wait_time:
            time.sleep(5)
            elapsed = int(time.time() - start_time)
            print(f"🎵 [BG] Checking status for request_id: {riffusion_request_id} (elapsed: {elapsed}s)")
            
            # Save progress status
            with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.status"), "w") as f:
                f.write(json.dumps({
                    "status": "generating",
                    "elapsed": elapsed,
                    "progress": min(int((elapsed / max_wait_time) * 100), 95)
                }))
            
            status_resp = requests.post(status_url, headers=headers, json=status_data, timeout=30)
            print(f"🎵 [BG] Status check response: {status_resp.status_code}")
            print(f"🎵 [BG] Status check body: {status_resp.text}")
            
            if status_resp.status_code == 200:
                status_result = status_resp.json()
                print(f"🎵 [BG] Status result: {status_result}")
                
                if status_result.get("status") == "complete":
                    data_obj = status_result.get("data", {}).get("data", [{}])[0]
                    audio_url = data_obj.get("stream_audio_url")
                    if audio_url:
                        print(f"🎵 [BG] Audio URL received: {audio_url}")
                        # --- 3. Скачивание файла ---
                        audio_resp = requests.get(audio_url, timeout=120)
                        if audio_resp.status_code == 200:
                            filename = f"{request_id}.mp3"
                            file_path = os.path.join(AUDIO_CACHE_DIR, filename)
                            with open(file_path, "wb") as f:
                                f.write(audio_resp.content)
                            print(f"✅ [BG] File saved: {file_path}")
                            
                            # Update final status
                            with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.status"), "w") as f:
                                f.write(json.dumps({
                                    "status": "complete",
                                    "elapsed": elapsed,
                                    "progress": 100
                                }))
                            return
                        else:
                            error_msg = f"Failed to download audio: {audio_resp.status_code}"
                            print(f"❌ [BG] {error_msg}")
                            raise Exception(error_msg)
                    else:
                        error_msg = "No audio URL in completed status"
                        print(f"❌ [BG] {error_msg}")
                        raise Exception(error_msg)
                elif status_result.get("status") == "failed":
                    error_msg = f"Generation failed: {status_result.get('details', 'Unknown error')}"
                    print(f"❌ [BG] {error_msg}")
                    raise Exception(error_msg)
                else:
                    print(f"⏳ [BG] Status: {status_result.get('status', 'unknown')}")
        
        error_msg = "Generation timed out after 5 minutes"
        print(f"❌ [BG] {error_msg}")
        raise Exception(error_msg)

    except Exception as e:
        print(f"❌ [BG] Error in background task {request_id}: {str(e)}")
        with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
            f.write(str(e))
        with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.status"), "w") as f:
            f.write(json.dumps({
                "status": "error",
                "error": str(e),
                "elapsed": int(time.time() - start_time) if 'start_time' in locals() else 0
            }))

@router.post("/generate-beat", response_model=GenerateBeatResponse)
async def generate_beat(request: GenerateBeatRequest, background_tasks: BackgroundTasks):
    """
    Запускает фоновую задачу для генерации музыки через Riffusion.
    """
    try:
        print(f"🎵 Received beat generation request: {request.prompt}")
        
        RIFFUSION_API_KEY = os.getenv("RIFFUSION_API_KEY")
        if not RIFFUSION_API_KEY:
            print("⚠️ RIFFUSION_API_KEY not configured")
            return GenerateBeatResponse(
                success=True, 
                audio_url="/audio_cache/demo_beat.mp3",
                message="Demo mode: RIFFUSION_API_KEY not configured"
            )
            
        request_id = uuid.uuid4().hex
        print(f"🎵 Generated request_id: {request_id}")

        # Create initial status file
        with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.status"), "w") as f:
            f.write(json.dumps({
                "status": "starting",
                "elapsed": 0,
                "progress": 0
            }))

        # Start background task
        print(f"🎵 Starting background task for request_id: {request_id}")
        background_tasks.add_task(_run_riffusion_generation, request.prompt, request_id)
        print(f"🎵 Background task added for request_id: {request_id}")

        return GenerateBeatResponse(
            success=True,
            status="pending",
            request_id=request_id,
            message="Generation started. Result will be ready in 30-60 seconds."
        )
    except Exception as e:
        print(f"❌ Error in generate_beat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start generation: {str(e)}")

@router.post("/generate-beat/status")
async def check_generation_status(request: GenerateBeatStatusRequest):
    """
    Проверяет статус генерации музыки по наличию файла в кеше.
    """
    try:
        request_id = request.request_id
        if not request_id:
            return JSONResponse(status_code=400, content={"success": False, "error": "request_id не указан"})
        
        # Проверяем файл с ошибкой
        error_file = os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error")
        if os.path.exists(error_file):
            with open(error_file, "r") as f:
                error_msg = f.read()
            return JSONResponse(content={"success": False, "status": "failed", "error": error_msg})
        
        # Проверяем готовый mp3 файл
        success_file = os.path.join(AUDIO_CACHE_DIR, f"{request_id}.mp3")
        if os.path.exists(success_file):
            return JSONResponse(content={
                "success": True, 
                "status": "complete",
                "local_audio_url": f"/audio_cache/{request_id}.mp3"
            })
        
        # Проверяем файл статуса
        status_file = os.path.join(AUDIO_CACHE_DIR, f"{request_id}.status")
        if os.path.exists(status_file):
            with open(status_file, "r") as f:
                status_data = json.loads(f.read())
            return JSONResponse(content={"success": True, **status_data})
        
        # Если нет ни одного файла статуса
        return JSONResponse(content={"success": True, "status": "pending", "progress": 0})
        
    except Exception as e:
        print(f"❌ Error checking status: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "status": "error", "error": str(e)}
        )

@router.get("/download-beat/{filename}")
async def download_beat(filename: str):
    """
    Скачивает сгенерированную музыку
    """
    try:
        # Проверяем безопасность имени файла
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail="Недопустимое имя файла")
        
        # Проверяем что файл существует
        file_path = os.path.join(AUDIO_CACHE_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        # Определяем MIME тип
        if filename.endswith('.mp3'):
            media_type = 'audio/mpeg'
        elif filename.endswith('.wav'):
            media_type = 'audio/wav'
        elif filename.endswith('.m4a'):
            media_type = 'audio/mp4'
        else:
            media_type = 'application/octet-stream'
        
        # Возвращаем файл для скачивания
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=f"aivi_generated_music_{filename}",
            headers={"Content-Disposition": f"attachment; filename=aivi_generated_music_{filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка скачивания файла {filename}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка скачивания файла") 