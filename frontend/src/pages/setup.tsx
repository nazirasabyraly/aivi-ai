import React, { useState } from 'react';
import { updateApiBaseUrl } from '../config';
import './setup.css';

const Setup: React.FC = () => {
  const [backendUrl, setBackendUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Проверяем доступность бэкенда
      const response = await fetch(`${backendUrl}/auth/ngrok-url`);
      if (!response.ok) {
        throw new Error('Не удается подключиться к бэкенду');
      }

      // Обновляем URL в конфигурации
      updateApiBaseUrl(backendUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1>🔧 Настройка API</h1>
        <p>Введите URL вашего бэкенда (ngrok URL)</p>
        
        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label htmlFor="backendUrl">Backend URL:</label>
            <input
              type="url"
              id="backendUrl"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="https://your-backend.ngrok-free.app"
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            disabled={isLoading || !backendUrl}
            className="submit-btn"
          >
            {isLoading ? 'Проверка...' : 'Сохранить'}
          </button>
        </form>

        <div className="setup-help">
          <h3>Как получить ngrok URL:</h3>
          <ol>
                            <li>Запустите бэкенд: <code>cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000</code></li>
                <li>Запустите ngrok: <code>ngrok http 8000</code></li>
            <li>Скопируйте HTTPS URL (например: https://abc123.ngrok-free.app)</li>
            <li>Вставьте URL в поле выше</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Setup; 