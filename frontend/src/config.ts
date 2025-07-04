// src/config.ts

// Определяем базовый URL API в зависимости от окружения
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const ngrokUrl = localStorage.getItem('ngrok_backend_url');
    if (ngrokUrl) return ngrokUrl;
  }
  
  // Приоритет переменных окружения
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Автоопределение для Docker
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return "http://localhost:8001";
    }
    // Для продакшена используем тот же хост, но порт 8001
    return `http://${hostname}:8001`;
  }
  
  return "http://localhost:8001";
};

export const API_BASE_URL = getApiBaseUrl();

// Функция для обновления URL при получении ngrok ссылки
export const updateApiBaseUrl = (ngrokUrl: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ngrok_backend_url', ngrokUrl);
    window.location.reload(); // Перезагружаем страницу для применения нового URL
  }
};

// Функция для обработки истекших токенов
export const handleTokenExpiration = () => {
  if (typeof window !== 'undefined') {
    // Очищаем токен
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    
    // Показываем уведомление
    alert('Сессия завершилась из-за бездействия. Пожалуйста, войдите в систему снова.');
    
    // Перенаправляем на страницу логина (корневой маршрут)
    window.location.href = '/';
  }
};

// Функция для проверки токена
export const checkTokenValidity = async () => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    handleTokenExpiration();
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      handleTokenExpiration();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    handleTokenExpiration();
    return false;
  }
};
