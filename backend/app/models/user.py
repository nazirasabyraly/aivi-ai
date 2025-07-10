from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for Google OAuth users
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Email confirmation fields
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)
    verification_code_expires = Column(DateTime, nullable=True)
    
    # OAuth fields
    google_id = Column(String, unique=True, nullable=True, index=True)
    clerk_id = Column(String, unique=True, nullable=True, index=True)
    avatar_url = Column(String, nullable=True)
    provider = Column(String, default="email")  # "email", "google", or "clerk"
    
    # Optional user profile fields
    name = Column(String, nullable=True)
    preferences = Column(String, nullable=True)  # JSON string for music preferences
    
    # Account limits and usage tracking
    account_type = Column(String, default="basic")  # "basic" or "pro"
    daily_usage = Column(Integer, default=0)
    last_usage_date = Column(DateTime, nullable=True)

class SavedSong(Base):
    __tablename__ = "saved_songs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    youtube_video_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    artist = Column(String, nullable=True)
    date_saved = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="saved_songs")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'ai'
    content = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", backref="chat_messages") 