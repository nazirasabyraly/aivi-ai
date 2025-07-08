from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status, Form
from fastapi.responses import JSONResponse
from typing import Dict, Any, List
import json
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

@router.post("/generate-beat", response_model=GenerateBeatResponse)
async def generate_beat(request: GenerateBeatRequest):
    """
    Генерирует музыку через Riffusion API по текстовому промпту.
    """
    try:
        prompt = request.prompt
        # --- Riffusion API параметры ---
        RIFFUSION_API_KEY = os.getenv("RIFFUSION_API_KEY")
        if not RIFFUSION_API_KEY:
            return GenerateBeatResponse(success=False, error="RIFFUSION_API_KEY не задан в переменных окружения")
        
        # Основной Riffusion API
        url = "https://riffusionapi.com/api/generate-music"
        headers = {
            "accept": "application/json",
            "x-api-key": RIFFUSION_API_KEY,
            "Content-Type": "application/json"
        }
        data = {
            "prompt": prompt
        }
        
        # Отправляем запрос на генерацию
        resp = requests.post(url, headers=headers, json=data, timeout=120)
        if resp.status_code != 200:
            return GenerateBeatResponse(success=False, error=f"Riffusion API error: {resp.text}")
        
        result = resp.json()
        print("Riffusion API response:", result)
        
        # Проверяем статус
        status = result.get("status")
        if status == "pending":
            # Асинхронная генерация - возвращаем информацию о процессе
            request_id = result.get("request_id")
            return GenerateBeatResponse(
                success=True, 
                status="pending",
                request_id=request_id,
                message="Генерация началась. Результат будет готов через 30-60 секунд."
            )
        elif status == "complete":
            # Готовый результат
            data = result.get("data", {})
            if data and "data" in data and len(data["data"]) > 0:
                audio_url = data["data"][0].get("stream_audio_url")
                if audio_url:
                    # Скачиваем mp3
                    audio_resp = requests.get(audio_url, timeout=120)
                    if audio_resp.status_code == 200:
                        # Сохраняем файл
                        import uuid
                        filename = f"riffusion_{uuid.uuid4().hex}.mp3"
                        file_path = os.path.join(AUDIO_CACHE_DIR, filename)
                        with open(file_path, "wb") as f:
                            f.write(audio_resp.content)
                        
                        return GenerateBeatResponse(success=True, audio_url=f"/audio_cache/{filename}")
                    else:
                        return GenerateBeatResponse(success=False, error="Не удалось скачать аудио")
                else:
                    return GenerateBeatResponse(success=False, error="Riffusion API не вернул ссылку на аудио")
            else:
                return GenerateBeatResponse(success=False, error="Неожиданная структура ответа от Riffusion API")
        elif status == "failed":
            details = result.get("details", {})
            error_msg = details.get("detail", "Неизвестная ошибка")
            return GenerateBeatResponse(success=False, error=f"Ошибка генерации: {error_msg}")
        else:
            return GenerateBeatResponse(success=False, error=f"Неизвестный статус от Riffusion API: {status}")
            
    except Exception as e:
        return GenerateBeatResponse(success=False, error=str(e))

@router.post("/generate-beat/status")
async def check_generation_status(request: GenerateBeatStatusRequest):
    """
    Проверяет статус генерации музыки
    """
    try:
        request_id = request.request_id
        RIFFUSION_API_KEY = os.getenv("RIFFUSION_API_KEY")
        if not RIFFUSION_API_KEY:
            return JSONResponse(content={"success": False, "error": "RIFFUSION_API_KEY не задан"})
        
        # Правильный URL для проверки статуса Riffusion согласно документации
        url = "https://riffusionapi.com/api/generate-music"
        headers = {
            "accept": "application/json",
            "x-api-key": RIFFUSION_API_KEY,
            "Content-Type": "application/json"
        }
        data = {
            "request_id": request_id
        }
        
        resp = requests.post(url, headers=headers, json=data, timeout=30)
        if resp.status_code != 200:
            return JSONResponse(content={"success": False, "error": f"Ошибка проверки статуса: {resp.text}"})
        
        result = resp.json()
        print(f"Status check for {request_id}: {result}")
        
        # Если статус complete и есть audio_url, скачиваем файл
        if result.get("status") == "complete":
            data = result.get("data", {})
            if data and "data" in data and len(data["data"]) > 0:
                audio_url = data["data"][0].get("stream_audio_url")
                if audio_url:
                    try:
                        print(f"Скачиваем аудио файл: {audio_url}")
                        audio_resp = requests.get(audio_url, timeout=120)
                        if audio_resp.status_code == 200:
                            # Сохраняем файл
                            import uuid
                            filename = f"riffusion_{uuid.uuid4().hex}.mp3"
                            file_path = os.path.join(AUDIO_CACHE_DIR, filename)
                            with open(file_path, "wb") as f:
                                f.write(audio_resp.content)
                            
                            # Обновляем результат с локальным путем
                            result["local_audio_url"] = f"/audio_cache/{filename}"
                            print(f"Файл сохранен как: {file_path}, URL: {result['local_audio_url']}")
                            
                    except Exception as e:
                        print(f"Ошибка скачивания аудио: {e}")
        
        print(f"Возвращаем результат: {result}")
        return JSONResponse(content={"success": True, "status": result})
        
    except Exception as e:
        print(f"Ошибка в check_generation_status: {e}")
        return JSONResponse(content={"success": False, "error": str(e)}) 