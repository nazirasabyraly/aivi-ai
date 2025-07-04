from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class EmailVerification(BaseModel):
    email: str
    verification_code: str

class ResendVerification(BaseModel):
    email: str

class User(UserBase):
    id: int
    created_at: datetime
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    username: Optional[str] = None

class SavedSongBase(BaseModel):
    youtube_video_id: str
    title: str
    artist: Optional[str] = None

class SavedSongCreate(SavedSongBase):
    pass

class SavedSong(SavedSongBase):
    id: int
    user_id: int
    date_saved: datetime

    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    role: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    timestamp: Optional[datetime] = None

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageOut(ChatMessageBase):
    id: int
    class Config:
        orm_mode = True

class GenerateBeatRequest(BaseModel):
    prompt: str

class GenerateBeatStatusRequest(BaseModel):
    request_id: str

class GenerateBeatResponse(BaseModel):
    success: bool
    audio_url: Optional[str] = None
    error: Optional[str] = None
    status: Optional[str] = None
    request_id: Optional[str] = None
    callback_url: Optional[str] = None
    message: Optional[str] = None 