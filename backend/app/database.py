from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Используем PostgreSQL из переменной окружения, или SQLite как fallback
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/vibematch.db")

if DATABASE_URL.startswith("sqlite"):
    # SQLite конфигурация
    os.makedirs('data', exist_ok=True)
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
elif DATABASE_URL.startswith("postgresql"):
    # PostgreSQL конфигурация - заменяем asyncpg на psycopg2
    if "asyncpg" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(DATABASE_URL)
else:
    # Fallback к SQLite
    os.makedirs('data', exist_ok=True)
    engine = create_engine("sqlite:///./data/vibematch.db", connect_args={"check_same_thread": False})

# Создаем сессию
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Функция для получения сессии базы данных
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
