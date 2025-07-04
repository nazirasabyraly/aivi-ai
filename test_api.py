#!/usr/bin/env python3
"""
Тестовый скрипт для проверки работы VibeMatch API
"""

import requests
import json
import time

BASE_URL = "http://localhost:8001"

def test_health():
    """Тест health check"""
    print("🔍 Тестируем health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health check: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_chat_endpoints():
    """Тест endpoints чата"""
    print("\n🔍 Тестируем endpoints чата...")
    
    # Тест получения рекомендаций
    print("📝 Тестируем получение рекомендаций...")
    try:
        mood_analysis = {
            "mood": "радостная",
            "emotions": ["счастье", "энергия"],
            "music_genre": "pop",
            "description": "Позитивное настроение"
        }
        
        response = requests.post(
            f"{BASE_URL}/chat/get-recommendations",
            json={"mood_analysis": mood_analysis},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Рекомендации получены: {len(data.get('global', {}).get('recommended_tracks', []))} треков")
            print(f"   Объяснение: {data.get('global', {}).get('explanation', 'Нет объяснения')}")
        else:
            print(f"❌ Ошибка получения рекомендаций: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Ошибка теста рекомендаций: {e}")
    
    # Тест генерации музыки
    print("\n🎵 Тестируем генерацию музыки...")
    try:
        response = requests.post(
            f"{BASE_URL}/chat/generate-beat",
            json={"prompt": "uplifting pop music with positive energy"},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                if data.get('status') == 'pending':
                    print(f"✅ Генерация началась (асинхронно): {data.get('message', '')}")
                    print(f"   Request ID: {data.get('request_id', 'N/A')}")
                elif data.get('audio_url'):
                    print(f"✅ Музыка готова: {data.get('audio_url')}")
                else:
                    print(f"⚠️ Неожиданный ответ: {data}")
            else:
                print(f"❌ Ошибка генерации: {data.get('error', 'Неизвестная ошибка')}")
        else:
            print(f"❌ HTTP ошибка генерации: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Ошибка теста генерации: {e}")

def test_supported_formats():
    """Тест получения поддерживаемых форматов"""
    print("\n🔍 Тестируем поддерживаемые форматы...")
    try:
        response = requests.get(f"{BASE_URL}/chat/supported-formats")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Поддерживаемые форматы: {data.get('supported_formats', [])}")
            print(f"   Максимальный размер: {data.get('max_file_size_mb', 'N/A')} MB")
        else:
            print(f"❌ Ошибка получения форматов: {response.status_code}")
    except Exception as e:
        print(f"❌ Ошибка теста форматов: {e}")

def main():
    print("🚀 Начинаем тестирование VibeMatch API...")
    print("=" * 50)
    
    # Тест health check
    if not test_health():
        print("❌ Сервер не отвечает. Завершаем тестирование.")
        return
    
    # Тест endpoints чата
    test_chat_endpoints()
    
    # Тест поддерживаемых форматов
    test_supported_formats()
    
    print("\n" + "=" * 50)
    print("✅ Тестирование завершено!")

if __name__ == "__main__":
    main() 