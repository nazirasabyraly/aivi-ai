from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import FRONTEND_URL
from ..database import get_db
from ..models.user import User
from app.services.auth_service import AuthService
from ..dependencies import get_current_user

router = APIRouter(tags=["auth"])
auth_service = AuthService()

@router.get("/ngrok-url")
async def get_ngrok_url(request: Request):
    """Возвращает текущий URL бэкенда для настройки фронтенда"""
    base_url = str(request.base_url).rstrip('/')
    return {"backend_url": base_url}

@router.get("/verify")
async def verify_token(current_user: User = Depends(get_current_user)):
    """
    Проверяет валидность токена
    """
    return {"valid": True, "user_id": current_user.id}
