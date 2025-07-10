#!/usr/bin/env python3
"""
Тест всех функций Aivi:
1. Система лимитов (3 анализа в день)
2. Избранное по пользователям
3. Скачивание сгенерированной музыки
"""

import requests
import json
import os
from datetime import datetime

# Конфигурация
API_BASE_URL = "http://localhost:8001"
FRONTEND_URL = "http://localhost:3000"

def test_daily_limits():
    """Тест системы дневных лимитов"""
    print("🔍 Тестируем систему дневных лимитов...")
    
    # Получаем информацию о пользователе
    headers = {
        "Authorization": "Bearer test_token",  # Заменить на реальный токен
        "Content-Type": "application/json"
    }
    
    try:
        # Проверяем текущие лимиты
        response = requests.get(f"{API_BASE_URL}/users/me", headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            print(f"✅ Пользователь: {user_data.get('username')}")
            print(f"📊 Тип аккаунта: {user_data.get('account_type', 'basic')}")
            print(f"🔢 Использовано сегодня: {user_data.get('daily_usage', 0)}/3")
            
            if user_data.get('account_type') == 'pro':
                print("🎉 PRO аккаунт - безлимитный доступ!")
            else:
                remaining = 3 - user_data.get('daily_usage', 0)
                print(f"⏳ Осталось анализов: {remaining}")
        else:
            print(f"❌ Ошибка получения данных пользователя: {response.status_code}")
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка подключения: {e}")

def test_user_favorites():
    """Тест персональных избранных"""
    print("\n💖 Тестируем систему избранного...")
    
    headers = {
        "Authorization": "Bearer test_token",  # Заменить на реальный токен
        "Content-Type": "application/json"
    }
    
    try:
        # Получаем избранные песни
        response = requests.get(f"{API_BASE_URL}/media/saved-songs", headers=headers)
        if response.status_code == 200:
            saved_songs = response.json()
            print(f"✅ Найдено избранных песен: {len(saved_songs)}")
            
            for song in saved_songs[:5]:  # Показываем первые 5
                print(f"🎵 {song.get('title')} - {song.get('artist')}")
                print(f"   YouTube ID: {song.get('youtube_video_id')}")
                print(f"   Дата сохранения: {song.get('date_saved')}")
                print()
        else:
            print(f"❌ Ошибка получения избранного: {response.status_code}")
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка подключения: {e}")

def test_download_functionality():
    """Тест функции скачивания"""
    print("\n📥 Тестируем функцию скачивания...")
    
    # Проверяем наличие файлов в audio_cache
    audio_cache_dir = "audio_cache"
    if os.path.exists(audio_cache_dir):
        files = [f for f in os.listdir(audio_cache_dir) if f.endswith(('.mp3', '.m4a', '.wav'))]
        print(f"✅ Найдено аудиофайлов: {len(files)}")
        
        if files:
            # Тестируем скачивание первого файла
            test_file = files[0]
            print(f"🎵 Тестируем скачивание: {test_file}")
            
            try:
                download_url = f"{API_BASE_URL}/chat/download-beat/{test_file}"
                response = requests.get(download_url)
                
                if response.status_code == 200:
                    print(f"✅ Файл доступен для скачивания")
                    print(f"📊 Размер файла: {len(response.content)} bytes")
                    print(f"🔗 URL: {download_url}")
                else:
                    print(f"❌ Ошибка скачивания: {response.status_code}")
            
            except requests.exceptions.RequestException as e:
                print(f"❌ Ошибка подключения: {e}")
        else:
            print("ℹ️  Нет файлов для тестирования скачивания")
    else:
        print("ℹ️  Директория audio_cache не найдена")

def test_music_generation():
    """Тест генерации музыки"""
    print("\n🎹 Тестируем генерацию музыки...")
    
    headers = {
        "Authorization": "Bearer test_token",  # Заменить на реальный токен
        "Content-Type": "application/json"
    }
    
    try:
        # Тестируем генерацию музыки
        data = {
            "prompt": "upbeat electronic music for testing"
        }
        
        response = requests.post(
            f"{API_BASE_URL}/chat/generate-beat",
            headers=headers,
            json=data
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ Запрос на генерацию отправлен успешно")
                if result.get('audio_url'):
                    print(f"🎵 Музыка готова: {result['audio_url']}")
                elif result.get('request_id'):
                    print(f"⏳ Генерация в процессе, ID: {result['request_id']}")
                else:
                    print(f"📝 Статус: {result.get('message', 'Неизвестно')}")
            else:
                print(f"❌ Ошибка генерации: {result.get('error')}")
        else:
            print(f"❌ Ошибка запроса: {response.status_code}")
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка подключения: {e}")

def main():
    """Основная функция тестирования"""
    print("🧪 Тестирование всех функций Aivi")
    print("=" * 50)
    
    # Проверяем доступность API
    try:
        response = requests.get(f"{API_BASE_URL}/auth/ngrok-url")
        if response.status_code == 200:
            print("✅ API доступен")
        else:
            print("❌ API недоступен")
            return
    except requests.exceptions.RequestException:
        print("❌ Не удается подключиться к API")
        return
    
    # Запускаем тесты
    test_daily_limits()
    test_user_favorites()
    test_download_functionality()
    test_music_generation()
    
    print("\n" + "=" * 50)
    print("🎉 Тестирование завершено!")
    print("\nℹ️  Для полного тестирования:")
    print("1. Замените 'test_token' на реальный Clerk токен")
    print("2. Авторизуйтесь в приложении")
    print("3. Сделайте несколько анализов для проверки лимитов")
    print("4. Добавьте песни в избранное")
    print("5. Сгенерируйте музыку и попробуйте скачать")

if __name__ == "__main__":
    main() 