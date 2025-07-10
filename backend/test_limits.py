#!/usr/bin/env python3
"""
Тестирование логики лимитов пользователей
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, date, timedelta
from app.database import get_db
from app.services.auth_service import AuthService
from app.models.user import User

def test_limits():
    """Тестирует логику лимитов"""
    auth_service = AuthService()
    
    # Получаем подключение к БД
    db = next(get_db())
    
    # Находим первого пользователя для тестирования
    user = db.query(User).first()
    if not user:
        print("❌ Пользователи не найдены")
        return
    
    print(f"🔍 Тестируем пользователя: {user.username} (ID: {user.id})")
    print(f"📊 Текущий статус:")
    print(f"  - daily_usage: {user.daily_usage}")
    print(f"  - last_usage_date: {user.last_usage_date}")
    print(f"  - account_type: {user.account_type}")
    
    # Проверяем оставшиеся анализы
    remaining = auth_service.get_remaining_analyses(db, user)
    print(f"  - remaining_analyses: {remaining}")
    
    # Симулируем использование
    print(f"\n🧪 Симулируем использование анализа...")
    try:
        can_use = auth_service.check_usage_limit(db, user)
        print(f"✅ Анализ разрешен: {can_use}")
        
        # Обновляем данные пользователя
        db.refresh(user)
        print(f"📊 После использования:")
        print(f"  - daily_usage: {user.daily_usage}")
        print(f"  - last_usage_date: {user.last_usage_date}")
        
        remaining = auth_service.get_remaining_analyses(db, user)
        print(f"  - remaining_analyses: {remaining}")
        
    except Exception as e:
        print(f"❌ Ошибка при проверке лимита: {e}")
    
    # Тестируем сброс лимитов (симулируем новый день)
    print(f"\n🕐 Симулируем новый день...")
    # Устанавливаем дату вчерашнего дня
    yesterday = datetime.utcnow() - timedelta(days=1)
    user.last_usage_date = yesterday
    user.daily_usage = 3  # Максимальный лимит
    db.commit()
    
    print(f"📊 Установили вчерашнюю дату:")
    print(f"  - daily_usage: {user.daily_usage}")
    print(f"  - last_usage_date: {user.last_usage_date}")
    
    # Проверяем сброс лимитов
    remaining = auth_service.get_remaining_analyses(db, user)
    print(f"  - remaining_analyses после сброса: {remaining}")
    
    # Обновляем данные пользователя
    db.refresh(user)
    print(f"📊 После сброса:")
    print(f"  - daily_usage: {user.daily_usage}")
    print(f"  - last_usage_date: {user.last_usage_date}")
    
    print(f"\n✅ Тест завершен!")

if __name__ == "__main__":
    test_limits() 