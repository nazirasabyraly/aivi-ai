# backend/app/api/media.py

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import SavedSong as DBSavedSong, User
from app.schemas import SavedSong as SavedSongSchema, SavedSongCreate
from typing import List
from datetime import datetime

# Используем правильную функцию из dependencies
from app.dependencies import get_current_user

router = APIRouter()

# Здесь будут только эндпоинты, связанные с загрузкой/анализом медиафайлов пользователя, без Spotify/Deezer/Last.fm

@router.get("/saved-songs", response_model=List[SavedSongSchema])
def get_saved_songs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    songs = db.query(DBSavedSong).filter(DBSavedSong.user_id == current_user.id).order_by(DBSavedSong.date_saved.desc()).all()
    print(f"🎵 [BACKEND] Fetching saved songs for user_id={current_user.id}: {len(songs)} songs found")
    for song in songs:
        print(f"  - {song.title} by {song.artist} (video_id: {song.youtube_video_id})")
    return songs

@router.post("/saved-songs", response_model=SavedSongSchema, status_code=status.HTTP_201_CREATED)
def add_saved_song(song: SavedSongCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    print(f"🎵 [BACKEND] Attempting to save song: title='{song.title}', artist='{song.artist}', video_id='{song.youtube_video_id}' for user_id={current_user.id}")
    
    # Проверяем, не сохранена ли уже эта песня у данного пользователя
    # Сначала проверяем по video_id
    existing_song_by_video = db.query(DBSavedSong).filter(
        DBSavedSong.user_id == current_user.id,
        DBSavedSong.youtube_video_id == song.youtube_video_id
    ).first()
    
    # Также проверяем по title и artist, чтобы избежать дубликатов одной песни с разными video_id
    existing_song_by_title = db.query(DBSavedSong).filter(
        DBSavedSong.user_id == current_user.id,
        DBSavedSong.title == song.title,
        DBSavedSong.artist == song.artist
    ).first()
    
    if existing_song_by_video:
        print(f"⚠️ [BACKEND] Song already exists by video_id: {existing_song_by_video.title} by {existing_song_by_video.artist}")
    
    if existing_song_by_title:
        print(f"⚠️ [BACKEND] Song already exists by title/artist: {existing_song_by_title.title} by {existing_song_by_title.artist} (video_id: {existing_song_by_title.youtube_video_id})")
    
    if existing_song_by_video or existing_song_by_title:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Эта песня уже сохранена в избранном"
        )
    
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
    
    print(f"✅ [BACKEND] Song saved successfully: {db_song.title} by {db_song.artist} (video_id: {db_song.youtube_video_id})")
    return db_song

@router.delete("/saved-songs/{youtube_video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_song(youtube_video_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_song = db.query(DBSavedSong).filter(DBSavedSong.user_id == current_user.id, DBSavedSong.youtube_video_id == youtube_video_id).first()
    if not db_song:
        raise HTTPException(status_code=404, detail="Song not found")
    db.delete(db_song)
    db.commit()
    return None
