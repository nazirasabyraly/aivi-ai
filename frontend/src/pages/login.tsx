// src/pages/Login.tsx

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './login.css'
import { API_BASE_URL } from '../config'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import ClerkAuth from '../components/ClerkAuth'

const Login = () => {
  const navigate = useNavigate()
  const { t, ready } = useTranslation()
  const { user } = useUser() // Clerk user
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showManualLogin, setShowManualLogin] = useState(false) // Возвращаем выбор
  const [isRegistering, setIsRegistering] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [authMethod, setAuthMethod] = useState<'none' | 'google' | 'clerk' | 'manual'>('none')
  
  // Включаем все методы аутентификации
  const enableGoogleOAuth = true;
  const enableClerkAuth = true;
  const enableEmailAuth = false; // Пока отключаем старый email auth

  // Обработка Google OAuth
  const handleGoogleAuth = () => {
    // Перенаправляем на backend endpoint для Google OAuth
    window.location.href = `${API_BASE_URL}/auth/google`;
    console.log(`${API_BASE_URL}/auth/google`)
  };

  // Проверяем Clerk пользователя
  useEffect(() => {
    if (user) {
      // Пользователь авторизован через Clerk
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Проверяем токен из URL при загрузке компонента (для OAuth callback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    
    if (token) {
      localStorage.setItem('auth_token', token);
      // Получаем информацию о пользователе
      fetch(`${API_BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.valid) {
          navigate('/dashboard');
        }
      })
      .catch(() => {
        setError('Ошибка при проверке токена');
      });
    } else if (error) {
      switch (error) {
        case 'oauth_error':
          setError('Ошибка OAuth авторизации');
          break;
        case 'csrf_error':
          setError('Ошибка безопасности. Попробуйте еще раз');
          break;
        case 'oauth_failed':
          setError('Не удалось войти через Google');
          break;
        default:
          setError('Ошибка авторизации');
      }
    }
  }, [navigate]);

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    if (!email || !password || (isRegistering && !username)) {
      setError('Пожалуйста, заполните все поля')
      setIsLoading(false)
      return
    }

    try {
      const endpoint = isRegistering ? '/users/register' : '/users/login'
      const requestData = isRegistering 
        ? { email, username, password }
        : { email, password }

      console.log('Отправляем запрос:', endpoint, { email, username: username || 'не указано' })

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()
      console.log('Получен ответ:', response.status, data)

      if (response.status === 201 && data.detail?.requires_verification) {
        setNeedsVerification(true)
        setVerificationEmail(data.detail.email)
        setMessage(data.detail.message)
      } else if (response.ok && data.access_token) {
        localStorage.setItem('auth_token', data.access_token)
        localStorage.setItem('user_info', JSON.stringify(data.user))
        navigate('/dashboard')
      } else if (response.status === 403) {
        if (data.detail?.requires_verification) {
          setNeedsVerification(true)
          setVerificationEmail(data.detail.email)
          setError('Для входа необходимо подтвердить email адрес')
        } else {
          setError(data.detail || 'Неверный email или пароль')
        }
      } else if (response.status === 404) {
        setError('Пользователь не найден. Проверьте email или зарегистрируйтесь')
      } else if (response.status === 400) {
        setError(data.detail || 'Неверные данные')
      } else {
        setError(data.detail || 'Ошибка аутентификации')
      }
    } catch (error) {
      console.error('Ошибка сети:', error)
      setError('Ошибка подключения к серверу')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!verificationCode) {
      setError('Введите код подтверждения')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationEmail,
          verification_code: verificationCode
        })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('auth_token', data.access_token)
        localStorage.setItem('user_info', JSON.stringify(data.user))
        navigate('/dashboard')
      } else {
        setError(data.detail || 'Неверный код подтверждения')
      }
    } catch (error) {
      setError('Ошибка подключения к серверу')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/users/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationEmail
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Код подтверждения отправлен повторно на ваш email!')
      } else {
        setError(data.detail || 'Ошибка при отправке кода')
      }
    } catch (error) {
      setError('Ошибка подключения к серверу')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setShowManualLogin(false)
    setNeedsVerification(false)
    setVerificationCode('')
    setError('')
    setMessage('')
  }

  // Если email авторизация отключена, принудительно показываем только Google
  const shouldShowManualLogin = enableEmailAuth && showManualLogin;

  // Show loading screen while i18n initializes
  if (!ready) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>🎵 Aivi</h1>
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  if (needsVerification) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>📧 Email Verification</h1>
            <p>Мы отправили код подтверждения на {verificationEmail}</p>
          </div>

          <form onSubmit={handleEmailVerification} className="login-form">
            <div className="form-group">
              <label htmlFor="verification_code">Код подтверждения</label>
              <input
                type="text"
                id="verification_code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Введите 6-значный код"
                maxLength={6}
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}
            <div className="form-actions">
              <button
                type="submit"
                disabled={isLoading}
                className="login-submit-btn"
              >
                {isLoading ? 'Проверяем...' : 'Подтвердить'}
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="toggle-btn"
              >
                Отправить код повторно
              </button>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="back-btn"
              >
                ← Назад к входу
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎵 Aivi</h1>
          <p>{t('welcome') || 'Анализ музыкального вкуса и ИИ-помощник'}</p>
        </div>

        {authMethod === 'none' ? (
          <div className="login-options">
            {enableClerkAuth && (
              <div className="clerk-signin-wrapper">
                <button
                  onClick={() => setAuthMethod('clerk')}
                  className="clerk-signin-btn"
                  type="button"
                >
                  📧 Войти через Email (с верификацией)
                </button>
              </div>
            )}
            
            {enableGoogleOAuth && (
              <>
                {enableClerkAuth && (
                  <div className="or-divider">
                    <span>или</span>
                  </div>
                )}
                <div className="google-signin-wrapper">
                  <button
                    onClick={handleGoogleAuth}
                    className="google-signin-btn"
                    type="button"
                  >
                    <svg className="google-icon" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Войти через Google
                  </button>
                </div>
              </>
            )}
            
            {enableEmailAuth && (
              <>
                <div className="or-divider">
                  <span>или</span>
                </div>
                <button
                  onClick={() => setShowManualLogin(true)}
                  className="manual-login-btn"
                >
                  {t('register_login') || 'Регистрация / Вход через Email'}
                </button>
              </>
            )}
          </div>
        ) : authMethod === 'clerk' ? (
          <div className="clerk-auth-container">
            <ClerkAuth 
              mode={isRegistering ? 'sign-up' : 'sign-in'} 
              onSuccess={() => navigate('/dashboard')}
            />
            <div className="auth-actions">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="toggle-btn"
              >
                {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('none')}
                className="back-btn"
              >
                ← Назад к выбору
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleManualAuth} className="login-form">
            {isRegistering && (
              <div className="form-group">
                <label htmlFor="username">{t('username') || 'Имя пользователя'}</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('enter_username') || 'Введите имя пользователя'}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">{t('password') || 'Пароль'}</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('enter_password') || 'Введите пароль'}
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}
            <div className="form-actions">
              <button
                type="submit"
                disabled={isLoading}
                className="login-submit-btn"
              >
                {isLoading ? (t('processing') || 'Обработка...') : (isRegistering ? (t('register') || 'Зарегистрироваться') : (t('login') || 'Войти'))}
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="toggle-btn"
              >
                {isRegistering ? (t('already_have_account') || 'Уже есть аккаунт? Войти') : (t('no_account') || 'Нет аккаунта? Зарегистрироваться')}
              </button>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="back-btn"
              >
                ← {t('back') || 'Назад'}
              </button>
            </div>
          </form>
        )}

        <div className="login-info">
          <h3>🚀 {t('what_can_do') || 'Что умеет Aivi?'}</h3>
          <ul>
            <li>📊 {t('analyze_music') || 'Анализ вашего музыкального вкуса'}</li>
            <li>🤖 {t('ai_chat') || 'ИИ-чат для анализа фото/видео'}</li>
            <li>🎵 {t('music_recommend') || 'Подбор музыки под ваш контент'}</li>
            <li>📱 {t('modern_ui') || 'Современный интерфейс'}</li>
            <li>🔐 {t('secure_login') || 'Быстрый вход через Google'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Login
