import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './login.css';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Получаем email из состояния навигации
    const state = location.state as { email?: string };
    if (state?.email) {
      setEmail(state.email);
    } else {
      navigate('/login');
    }
  }, [location, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Введите 6-значный код подтверждения');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          verification_code: verificationCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        setSuccess('Email подтвержден! Перенаправляем в приложение...');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError(data.detail || 'Ошибка подтверждения');
      }
    } catch (error) {
      setError('Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/users/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Код отправлен повторно!');
        setCanResend(false);
        setCountdown(60); // 60 секунд до следующей отправки
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.detail || 'Ошибка отправки кода');
      }
    } catch (error) {
      setError('Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎵 AI Music</h1>
          <h2>Подтверждение Email</h2>
          <p>Мы отправили код подтверждения на адрес:</p>
          <strong>{email}</strong>
        </div>

        <form onSubmit={handleVerification} className="login-form">
          <div className="form-group">
            <label htmlFor="code">Код подтверждения</label>
            <input
              type="text"
              id="code"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
              }}
              placeholder="123456"
              maxLength={6}
              className="verification-code-input"
              required
            />
            <small>Введите 6-значный код из письма</small>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-actions">
            <button
              type="submit"
              disabled={isLoading || verificationCode.length !== 6}
              className="login-submit-btn"
            >
              {isLoading ? 'Проверяем...' : 'Подтвердить'}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={!canResend || isLoading}
              className="toggle-btn"
            >
              {canResend 
                ? 'Отправить код повторно' 
                : `Повторная отправка через ${countdown}с`}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="back-btn"
            >
              ← Назад к входу
            </button>
          </div>
        </form>

        <div className="verification-tips">
          <h4>💡 Не получили код?</h4>
          <ul>
            <li>Проверьте папку "Спам" или "Нежелательная почта"</li>
            <li>Убедитесь, что email адрес указан правильно</li>
            <li>Код действителен в течение 15 минут</li>
            <li>Если проблемы продолжаются, попробуйте повторную отправку</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail; 