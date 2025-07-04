import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config'
import InteractiveStudio from '../components/InteractiveStudio'
import { useTranslation } from 'react-i18next'
import Recommendations from '../components/Recommendations'
import Favorites from '../components/Favorites'

const Dashboard = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'studio' | 'recommendations' | 'favorites'>('studio')

  useEffect(() => {
    // Проверяем только email/пароль авторизацию
    const authToken = localStorage.getItem('auth_token')
    if (!authToken) {
      navigate('/')
      return
    }
    setLoading(false)
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
    navigate('/')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h2>{t('loading')}</h2>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'var(--text)', width: '100vw', boxSizing: 'border-box' }}>
      <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 1000 }}>
        <button 
          onClick={handleLogout}
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#333',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}
        >
          {t('logout')}
        </button>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 20px 0 20px' }}>
        <div style={{ 
          display: 'flex', 
          background: 'rgba(255, 255, 255, 0.15)', 
          borderRadius: '16px', 
          padding: '8px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <button
            onClick={() => setActiveTab('studio')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'studio' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
              color: activeTab === 'studio' ? '#333' : 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              minWidth: '140px'
            }}
          >
            🎵 {t('dashboard_studio')}
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'recommendations' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
              color: activeTab === 'recommendations' ? '#333' : 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              minWidth: '140px'
            }}
          >
            🔍 {t('dashboard_search')}
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'favorites' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
              color: activeTab === 'favorites' ? '#333' : 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              minWidth: '140px'
            }}
          >
            ❤️ {t('dashboard_favorites')}
          </button>
        </div>
      </div>
      
      <div style={{ minHeight: 'calc(100vh - 100px)' }}>
        {activeTab === 'studio' && <InteractiveStudio />}
        {activeTab === 'recommendations' && (
          <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ 
              background: 'white', 
              borderRadius: '20px', 
              padding: '2rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <Recommendations />
            </div>
          </div>
        )}
        {activeTab === 'favorites' && (
          <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ 
              background: 'white', 
              borderRadius: '20px', 
              padding: '2rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <Favorites />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard 