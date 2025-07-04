# backend/app/api/media.py

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import SavedSong as DBSavedSong, User
from app.schemas import SavedSong as SavedSongSchema, SavedSongCreate
from typing import List
from datetime import datetime

from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # Простейшая заглушка, заменить на реальную проверку токена
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

router = APIRouter()

# Здесь будут только эндпоинты, связанные с загрузкой/анализом медиафайлов пользователя, без Spotify/Deezer/Last.fm

@router.get("/saved-songs", response_model=List[SavedSongSchema])
def get_saved_songs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(DBSavedSong).filter(DBSavedSong.user_id == current_user.id).order_by(DBSavedSong.date_saved.desc()).all()

@router.post("/saved-songs", response_model=SavedSongSchema, status_code=status.HTTP_201_CREATED)
def add_saved_song(song: SavedSongCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_song = DBSavedSong(
        user_id=current_user.id,
        youtube_video_id=song.youtube_video_id,
        title=song.title,
        artist=song.artist,
        date_saved=datetime.utcnow()
    )
    db.add(db_song)
    db.commit()
    db.refresh(db_song)
    return db_song

@router.delete("/saved-songs/{youtube_video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_song(youtube_video_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_song = db.query(DBSavedSong).filter(DBSavedSong.user_id == current_user.id, DBSavedSong.youtube_video_id == youtube_video_id).first()
    if not db_song:
        raise HTTPException(status_code=404, detail="Song not found")
    db.delete(db_song)
    db.commit()
    return None
