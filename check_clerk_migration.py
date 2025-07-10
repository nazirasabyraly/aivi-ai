#!/usr/bin/env python3
"""
Проверяет, есть ли колонка clerk_id в таблице users
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from sqlalchemy import create_engine, text, inspect
    from dotenv import load_dotenv
    
    load_dotenv()
    
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/vibematch.db")
    
    # Заменяем asyncpg на psycopg2 если нужно
    if "asyncpg" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    
    print(f"🔍 Подключаемся к базе данных...")
    print(f"📊 DATABASE_URL: {DATABASE_URL[:50]}...")
    
    engine = create_engine(DATABASE_URL)
    
    # Проверяем подключение
    with engine.connect() as conn:
        print("✅ Подключение к БД успешно")
        
        # Проверяем, существует ли таблица users
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'users' in tables:
            print("✅ Таблица 'users' найдена")
            
            # Получаем колонки таблицы users
            columns = inspector.get_columns('users')
            column_names = [col['name'] for col in columns]
            
            print(f"📋 Колонки в таблице users:")
            for col in columns:
                print(f"  - {col['name']}: {col['type']}")
            
            # Проверяем наличие clerk_id
            if 'clerk_id' in column_names:
                print("\n✅ Колонка 'clerk_id' ЕСТЬ в таблице!")
                
                # Проверяем индекс
                indexes = inspector.get_indexes('users')
                clerk_index_exists = any('clerk_id' in idx.get('column_names', []) for idx in indexes)
                
                if clerk_index_exists:
                    print("✅ Индекс для clerk_id найден")
                else:
                    print("⚠️  Индекс для clerk_id отсутствует")
                    
            else:
                print("\n❌ Колонка 'clerk_id' ОТСУТСТВУЕТ в таблице!")
                print("🔧 Нужно применить миграцию:")
                print("   ./apply_migration.sh")
                
        else:
            print("❌ Таблица 'users' не найдена")
            print("🔧 Нужно создать таблицы")

except Exception as e:
    print(f"❌ Ошибка: {str(e)}")
    print("\n💡 Возможные причины:")
    print("1. База данных недоступна")
    print("2. Неправильный DATABASE_URL")
    print("3. Отсутствуют права доступа")
    print("4. PostgreSQL не запущен")

print("\n🎯 Следующие шаги:")
print("1. Если clerk_id отсутствует - применить миграцию")
print("2. Если БД недоступна - проверить подключение")
print("3. Если все OK - проблема в другом месте") 