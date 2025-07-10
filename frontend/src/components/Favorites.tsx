import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';
import { useUser, useAuth } from '@clerk/clerk-react';
import BeautifulAudioPlayer from './BeautifulAudioPlayer';

interface SavedSong {
  id: number;
  youtube_video_id: string;
  title: string;
  artist?: string;
  date_saved: string;
}

const Favorites: React.FC = () => {
  const { t } = useTranslation();
  const { user, isLoaded } = useUser(); // Clerk user
  const { getToken } = useAuth(); // Clerk token
  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSongs = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    // Ждем загрузки Clerk
    if (!isLoaded) {
      setLoading(true);
      return;
    }
    
    // Проверяем авторизацию: Clerk пользователь или старый токен
    const token = localStorage.getItem('auth_token');
    if (!user && !token) {
      setError(t('favorites_login_required') || 'Войдите в систему, чтобы посмотреть избранное');
      setLoading(false);
      return;
    }

    // Для Clerk пользователей получаем токен и делаем запрос к API
    if (user) {
      try {
        // Получаем токен Clerk для авторизации на backend
        const token = await getToken();
        
        const resp = await fetch(`${API_BASE_URL}/media/saved-songs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (resp.ok) {
          const data = await resp.json();
          setSongs(data);
        } else {
          setError('Ошибка загрузки избранного');
        }
      } catch (error) {
        console.error('Error fetching Clerk user songs:', error);
        setError('Ошибка сети');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      const resp = await fetch(`${API_BASE_URL}/media/saved-songs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setSongs(data);
      } else {
        setError(t('favorites_load_failed') || 'Ошибка загрузки избранного');
      }
    } catch {
      setError(t('favorites_load_error') || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [user, isLoaded, getToken, t]);

  const handleDelete = async (youtube_video_id: string) => {
    let token: string | null = null;
    
    // Получаем токен в зависимости от типа пользователя
    if (user) {
      try {
        token = await getToken();
      } catch (error) {
        console.error('Error getting Clerk token:', error);
        return;
      }
    } else {
      token = localStorage.getItem('auth_token');
    }
    
    if (!token) return;
    
    setDeletingId(youtube_video_id);
    try {
      const resp = await fetch(`${API_BASE_URL}/media/saved-songs/${youtube_video_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        setSongs(songs => songs.filter(s => s.youtube_video_id !== youtube_video_id));
        setSuccess(t('favorites_deleted'));
      } else {
        setError(t('favorites_delete_failed'));
      }
    } catch {
      setError(t('favorites_delete_error'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '4rem',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#666', fontSize: '1.2rem' }}>{t('favorites_loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '16px',
        textAlign: 'center',
        fontWeight: '500',
        fontSize: '1.1rem'
      }}>
        {error}
      </div>
    );
  }

  if (!songs.length) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '4rem 2rem',
        color: '#666'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💔</div>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>
          {t('favorites_no_songs')}
        </h3>
        <p style={{ fontSize: '1.1rem', margin: '0' }}>
          {t('favorites_start_liking')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', color: '#333' }}>
          ❤️ {t('favorites_title')}
        </h2>
        <p style={{ fontSize: '1.2rem', color: '#666', margin: '0' }}>
          {songs.length} {songs.length === 1 ? t('favorites_count_single') : t('favorites_count_multiple')}
        </p>
      </div>

      {success && (
        <div style={{ 
          background: 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          textAlign: 'center',
          fontWeight: '500'
        }}>
          {success}
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '2rem' 
      }}>
        {songs.map(song => (
          <div 
            key={song.id} 
            style={{ 
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              border: '1px solid #e9ecef',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'
            }} />
            
            <div style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                {typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) ? null : (
                  <div style={{ 
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '1rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}>
                    <iframe
                      width="100%"
                      height="200"
                      src={`https://www.youtube.com/embed/${song.youtube_video_id}`}
                      title={song.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ display: 'block' }}
                    />
                  </div>
                )}
                <BeautifulAudioPlayer
                  src={`${API_BASE_URL}/recommend/youtube-audio?video_id=${song.youtube_video_id}`}
                  title={song.title}
                  artist={song.artist}
                  style={{ 
                    width: '100%', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ 
                  fontWeight: '700', 
                  fontSize: '1.3rem', 
                  marginBottom: '0.5rem',
                  color: '#333',
                  lineHeight: '1.4'
                }}>
                  {song.title}
                </h3>
                <p style={{ 
                  color: '#667eea', 
                  fontSize: '1.1rem', 
                  fontWeight: '500',
                  margin: '0 0 0.5rem 0'
                }}>
                  {song.artist}
                </p>
                <p style={{ 
                  color: '#999', 
                  fontSize: '0.9rem', 
                  margin: '0'
                }}>
                  {t('favorites_date_added')}: {new Date(song.date_saved).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
              
              <button
                onClick={() => handleDelete(song.youtube_video_id)}
                disabled={deletingId === song.youtube_video_id}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: deletingId === song.youtube_video_id 
                    ? 'linear-gradient(135deg, #ccc 0%, #999 100%)'
                    : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  cursor: deletingId === song.youtube_video_id ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: deletingId === song.youtube_video_id ? '0.6' : '1'
                }}
                onMouseEnter={(e) => {
                  if (deletingId !== song.youtube_video_id) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (deletingId !== song.youtube_video_id) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {deletingId === song.youtube_video_id ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #ffffff40',
                      borderTop: '2px solid #ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    {t('favorites_removing')}
                  </span>
                ) : (
                  '🗑️ ' + t('favorites_delete')
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Favorites; 