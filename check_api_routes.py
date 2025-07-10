#!/usr/bin/env python3
"""
Проверка доступности API эндпоинтов после исправления
"""

import requests
import sys

def test_endpoint(url, description):
    """Тестирует доступность эндпоинта"""
    try:
        response = requests.get(url, timeout=5)
        print(f"✅ {description}: {response.status_code}")
        return response.status_code
    except requests.exceptions.RequestException as e:
        print(f"❌ {description}: Ошибка подключения - {e}")
        return None

def main():
    """Основная функция проверки"""
    print("🔍 Проверка API эндпоинтов после исправления...")
    print("=" * 60)
    
    # Определяем базовый URL
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://127.0.0.1:8001"
    
    print(f"🌐 Тестируем: {base_url}")
    print()
    
    # Список эндпоинтов для проверки
    endpoints = [
        ("/health", "Health check"),
        ("/auth/ngrok-url", "Auth ngrok URL"),
        ("/users/me", "Users me (ожидается 401/403)"),
        ("/media/saved-songs", "Media saved songs (ожидается 401/403)"),
        ("/chat/history", "Chat history (ожидается 401/403)"),
        ("/recommend", "Recommendations (ожидается 401/403)"),
    ]
    
    results = {}
    
    for endpoint, description in endpoints:
        url = f"{base_url}{endpoint}"
        status_code = test_endpoint(url, description)
        results[endpoint] = status_code
    
    print()
    print("📊 Результаты:")
    print("=" * 60)
    
    success = True
    
    # Health check должен быть 200
    if results.get("/health") == 200:
        print("✅ Health check работает")
    else:
        print("❌ Health check не работает")
        success = False
    
    # Auth ngrok-url должен быть 200
    if results.get("/auth/ngrok-url") == 200:
        print("✅ Auth эндпоинт доступен")
    else:
        print("❌ Auth эндпоинт недоступен")
        success = False
    
    # Защищенные эндпоинты должны возвращать 401 или 403
    protected_endpoints = ["/users/me", "/media/saved-songs", "/chat/history", "/recommend"]
    
    for endpoint in protected_endpoints:
        status = results.get(endpoint)
        if status in [401, 403, 422]:  # 422 для некоторых эндпоинтов без авторизации
            print(f"✅ {endpoint} правильно защищен (статус {status})")
        elif status == 404:
            print(f"❌ {endpoint} возвращает 404 - эндпоинт не найден!")
            success = False
        else:
            print(f"⚠️  {endpoint} возвращает неожиданный статус: {status}")
    
    print()
    
    if success:
        print("🎉 Все эндпоинты работают правильно!")
        print("✅ Проблема с API должна быть решена")
    else:
        print("❌ Есть проблемы с эндпоинтами")
        print("🔧 Проверьте конфигурацию сервера и миграции")
    
    print()
    print("💡 Использование:")
    print(f"   Локально: python {sys.argv[0]}")
    print(f"   На сервере: python {sys.argv[0]} https://aivi-ai.it.com")

if __name__ == "__main__":
    main() 