#!/usr/bin/env python3
"""
Тестовый скрипт с авторизацией для проверки работы VibeMatch API
"""

import requests
import json

BASE_URL = "http://localhost:8001"

def test_with_auth():
    """Тест с авторизацией"""
    print("🔍 Тестируем с авторизацией...")
    
    # Сначала логинимся
    try:
        # Создаем пользователя если не существует
        register_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpassword"
        }
        register_resp = requests.post(f"{BASE_URL}/api/users/register", json=register_data)
        print(f"Регистрация: {register_resp.status_code}")
        
        # Логинимся
        login_data = {
            "email": "test@example.com",
            "password": "testpassword"
        }
        login_resp = requests.post(f"{BASE_URL}/api/users/login", json=login_data)
        if login_resp.status_code == 200:
            token_data = login_resp.json()
            token = token_data.get('access_token')
            print(f"✅ Авторизация успешна, токен получен")
            
            # Тестируем рекомендации с токеном
            mood_analysis = {
                "mood": "радостная",
                "emotions": ["счастье", "энергия"],
                "music_genre": "pop",
                "description": "Позитивное настроение"
            }
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
            
            print("📝 Тестируем получение рекомендаций с токеном...")
            rec_resp = requests.post(
                f"{BASE_URL}/chat/get-recommendations",
                json=mood_analysis,
                headers=headers
            )
            
            if rec_resp.status_code == 200:
                data = rec_resp.json()
                print(f"✅ Рекомендации получены успешно!")
                print(f"   Глобальных треков: {len(data.get('global', {}).get('recommended_tracks', []))}")
                print(f"   Персональных треков: {len(data.get('personal', {}).get('recommended_tracks', []))}")
                
                # Показываем первые треки
                global_tracks = data.get('global', {}).get('recommended_tracks', [])
                if global_tracks:
                    print(f"   Первый трек: {global_tracks[0].get('name', 'N/A')} - {global_tracks[0].get('artist', 'N/A')}")
                
            else:
                print(f"❌ Ошибка рекомендаций: {rec_resp.status_code} - {rec_resp.text}")
                
        else:
            print(f"❌ Ошибка авторизации: {login_resp.status_code} - {login_resp.text}")
            
    except Exception as e:
        print(f"❌ Ошибка теста: {e}")

if __name__ == "__main__":
    test_with_auth() 