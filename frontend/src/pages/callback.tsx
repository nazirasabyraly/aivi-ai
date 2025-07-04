// src/pages/Callback.tsx

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config'

const Callback = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const errorParam = params.get('error')

    if (errorParam) {
      setError('Ошибка авторизации. Пожалуйста, попробуйте снова.')
      return
    }

    // Если осталась логика для других OAuth — реализовать здесь
    // Если нет — просто редирект на главную
    navigate('/')
  }, [navigate])

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2>Ошибка авторизации</h2>
        <p>{error}</p>
        <button
          style={{ marginTop: 24, padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#667eea', color: '#fff', border: 'none', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h2>Завершаем авторизацию...</h2>
      <p>Пожалуйста, подождите ⏳</p>
    </div>
  )
}

export default Callback
