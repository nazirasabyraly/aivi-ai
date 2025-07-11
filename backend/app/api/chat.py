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
        RIFFUSION_API_KEY = os.getenv("RIFFUSION_API_KEY")
        if not RIFFUSION_API_KEY:
            print("❌ RIFFUSION_API_KEY не задан для фоновой задачи")
            with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
                f.write("Server not configured for music generation.")
            return

        print(f"🎵 [BG] Запускаем генерацию для request_id: {request_id}")
        
        # --- 1. Отправка запроса на генерацию ---
        url = "https://riffusionapi.com/api/generate-music"
        headers = {
            "accept": "application/json",
            "x-api-key": RIFFUSION_API_KEY,
            "Content-Type": "application/json"
        }
        data = {"prompt": prompt}

        async with aiohttp.ClientSession() as session:
            # Отправляем запрос на генерацию
            async with session.post(url, headers=headers, json=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Ошибка API: {error_text}")
                    with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
                        f.write(f"API Error: {error_text}")
                    return
                
                result = await response.json()
                task_id = result.get("task_id")
                
                if not task_id:
                    print("❌ Не получен task_id")
                    with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
                        f.write("Failed to get task_id from API")
                    return

            # --- 2. Ожидание завершения генерации ---
            status_url = f"https://riffusionapi.com/api/check-status/{task_id}"
            max_attempts = 60  # 5 минут максимум (5 секунд * 60)
            attempt = 0

            while attempt < max_attempts:
                async with session.get(status_url, headers=headers) as status_response:
                    if status_response.status != 200:
                        error_text = await status_response.text()
                        print(f"❌ Ошибка проверки статуса: {error_text}")
                        break

                    status_data = await status_response.json()
                    if status_data.get("status") == "completed":
                        audio_url = status_data.get("audio_url")
                        if audio_url:
                            # --- 3. Скачивание готового аудио ---
                            async with session.get(audio_url) as audio_response:
                                if audio_response.status == 200:
                                    audio_data = await audio_response.read()
                                    output_path = os.path.join(AUDIO_CACHE_DIR, f"{request_id}.mp3")
                                    with open(output_path, "wb") as f:
                                        f.write(audio_data)
                                    print(f"✅ Аудио успешно сохранено: {output_path}")
                                    return
                                else:
                                    error_text = await audio_response.text()
                                    print(f"❌ Ошибка скачивания аудио: {error_text}")
                                    with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
                                        f.write(f"Download Error: {error_text}")
                                    return

                    elif status_data.get("status") == "failed":
                        error_msg = status_data.get("error", "Unknown error")
                        print(f"❌ Генерация не удалась: {error_msg}")
                        with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
                            f.write(f"Generation failed: {error_msg}")
                        return

                await asyncio.sleep(5)  # Ждем 5 секунд между проверками
                attempt += 1

            # Если вышли по таймауту
            if attempt >= max_attempts:
                print("❌ Таймаут генерации")
                with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
                    f.write("Generation timeout after 5 minutes")

    except Exception as e:
        print(f"❌ Ошибка в фоновой задаче: {str(e)}")
        with open(os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error"), "w") as f:
            f.write(f"Error: {str(e)}")


@router.post("/generate-beat", response_model=GenerateBeatResponse)
async def generate_beat(request: GenerateBeatRequest, background_tasks: BackgroundTasks):
    """
    Запускает фоновую задачу для генерации музыки через Riffusion.
    """
    RIFFUSION_API_KEY = os.getenv("RIFFUSION_API_KEY")
    if not RIFFUSION_API_KEY:
        return GenerateBeatResponse(
            success=True, 
            audio_url="/audio_cache/demo_beat.mp3", # Возвращаем демо, если ключ не настроен
            message="Демо-режим: RIFFUSION_API_KEY не настроен"
        )
        
    prompt = request.prompt
    request_id = uuid.uuid4().hex  # Генерируем уникальный ID для отслеживания

    # Запускаем тяжелую задачу в фоне
    background_tasks.add_task(_run_riffusion_generation, prompt, request_id)

    # Немедленно возвращаем ID для отслеживания
    return GenerateBeatResponse(
        success=True,
        request_id=request_id,
        message="Генерация запущена"
    )


@router.post("/generate-beat/status")
async def check_generation_status(request: GenerateBeatStatusRequest):
    """
    Проверяет статус генерации бита по request_id
    """
    request_id = request.request_id
    
    # Проверяем наличие ошибки
    error_file = os.path.join(AUDIO_CACHE_DIR, f"{request_id}.error")
    if os.path.exists(error_file):
        with open(error_file, "r") as f:
            error_message = f.read()
        return {
            "status": "error",
            "error": error_message
        }
    
    # Проверяем наличие готового файла
    output_file = os.path.join(AUDIO_CACHE_DIR, f"{request_id}.mp3")
    if os.path.exists(output_file):
        return {
            "status": "completed",
            "audio_url": f"/download-beat/{request_id}.mp3"
        }
    
    # Если нет ни ошибки, ни готового файла - значит всё ещё генерируется
    return {
        "status": "generating",
        "message": "Генерация в процессе..."
    }

@router.get("/download-beat/{filename}")
async def download_beat(filename: str):
    """
    Скачивание сгенерированного бита
    """
    file_path = os.path.join(AUDIO_CACHE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(file_path) 