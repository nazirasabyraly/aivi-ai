import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import InteractiveStudio from '../components/InteractiveStudio';
import Favorites from '../components/Favorites';
import Profile from './profile';
import SearchPage from './SearchPage'; // Импортируем страницу поиска
import { API_BASE_URL } from '../config';
import { toast } from 'react-toastify';

interface Track {
  video_id: string;
  title: string;
  artist: string;
  description?: string;
}

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'studio' | 'favorites' | 'profile' | 'search'>('studio');
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
  const [likedSongsData, setLikedSongsData] = useState<any[]>([]);
  const [language, setLanguage] = useState('ru');

  const fetchLikedSongs = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/media/saved-songs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const songs = await response.json();
        console.log('🎵 Fetched liked songs:', songs);
        setLikedSongs(new Set(songs.map((s: any) => s.youtube_video_id)));
        setLikedSongsData(songs); // Сохраняем полные данные песен
        console.log('🎵 Liked songs Set:', Array.from(new Set(songs.map((s: any) => s.youtube_video_id))));
      }
    } catch (error) {
      console.error("Failed to fetch liked songs:", error);
    }
  };

  const handleLikeUpdate = () => {
    fetchLikedSongs();
  };

  const fetchUserProfile = async () => {
    // Не сбрасываем состояние при повторных вызовах, 
    // чтобы избежать моргания UI
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error("Request timed out");
      }, 15000); // 15 секунд

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch user profile. Status: ${response.status}`, errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      setUserProfile(data);
      setError(null); // Сбрасываем ошибку при успехе

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("The server took too long to respond. Please check your connection and try again.");
      } else {
        setError(err.message);
      }
      // Оставим setLoading(false) в finally, чтобы он всегда выполнялся
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isLoaded) {
      fetchUserProfile();
      fetchLikedSongs();
    } else if (!user && isLoaded) {
      navigate('/login');
    }
  }, [user, isLoaded, navigate]);

  const handleAnalysisComplete = (analysis: any) => {
    // setActiveTab('recommendations'); // Removed as per edit
    // getRecommendations(analysis); // Removed as per edit
  };

  // Removed getRecommendations function as per edit

  const handleLogout = async () => {
    if (user) {
      await signOut();
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    navigate('/login');
  };

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => fetchUserProfile()}>Try again</button>
      </div>
    );
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
            onClick={() => setActiveTab('search')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'search' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
              color: activeTab === 'search' ? '#333' : 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              minWidth: '140px'
            }}
          >
            🔍 {t('dashboard_search') || 'Поиск'}
          </button>
          {/* Removed recommendations button as per edit */}
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
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'profile' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
              color: activeTab === 'profile' ? '#333' : 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              minWidth: '140px'
            }}
          >
            👤 {t('profile') || 'Профиль'}
          </button>
        </div>
      </div>
      
      <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {activeTab === 'studio' && <InteractiveStudio onAnalysisComplete={handleAnalysisComplete} onLikeUpdate={handleLikeUpdate} likedSongs={likedSongs} likedSongsData={likedSongsData} />}
        {activeTab === 'search' && <SearchPage />}
        {activeTab === 'favorites' && <Favorites onLikeUpdate={handleLikeUpdate} />}
        {activeTab === 'profile' && <Profile />}
      </main>

    </div>
  );
};

export default Dashboard; 