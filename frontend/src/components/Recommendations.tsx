import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';
import BeautifulAudioPlayer from './BeautifulAudioPlayer';

interface YouTubeVideo {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

const Recommendations: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState<{ [videoId: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/recommend/youtube-search?q=${encodeURIComponent(query)}`);
      const data = await resp.json();
      if (data.results) {
        setResults(data.results);
      } else {
        setResults([]);
        setError(data.error || t('recommendations_error'));
      }
    } catch (err) {
      setError(t('recommendations_error'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (video: YouTubeVideo) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError(t('recommendations_login_required'));
      return;
    }
    try {
      const resp = await fetch(`${API_BASE_URL}/media/saved-songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          youtube_video_id: video.video_id,
          title: video.title,
          artist: video.channel
        })
      });
      if (resp.ok) {
        setLiked(prev => ({ ...prev, [video.video_id]: true }));
        setSuccess(t('recommendations_success_like'));
      } else {
        setError(t('recommendations_error'));
      }
    } catch {
      setError(t('recommendations_error'));
    }
  };

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', color: '#333' }}>
          🔍 {t('dashboard_search')}
        </h2>
        <p style={{ fontSize: '1.2rem', color: '#666', margin: '0' }}>
          {t('recommendations_search_placeholder')}
        </p>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          maxWidth: '600px', 
          margin: '0 auto',
          background: 'white',
          padding: '8px',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '2px solid #e9ecef'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('recommendations_search_placeholder')}
            style={{ 
              flex: 1, 
              padding: '16px 20px', 
              borderRadius: '12px', 
              border: 'none',
              fontSize: '1.1rem',
              outline: 'none',
              background: 'transparent'
            }}
          />
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            style={{ 
              padding: '16px 32px', 
              borderRadius: '12px', 
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white', 
              border: 'none', 
              fontWeight: '600',
              fontSize: '1.1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid #ffffff40',
                  borderTop: '2px solid #ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                {t('recommendations_searching')}
              </span>
            ) : (
              t('recommendations_search_button')
            )}
          </button>
        </div>
      </form>

      {error && (
        <div style={{ 
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontWeight: '500'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          background: 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
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
        {results.map(video => (
          <div 
            key={video.video_id} 
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
              e.currentTarget.style.transform = 'translateY(-8px)';
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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
                      src={`https://www.youtube.com/embed/${video.video_id}`}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ display: 'block' }}
                    />
                  </div>
                )}
                <BeautifulAudioPlayer
                  src={`${API_BASE_URL}/recommend/youtube-audio?video_id=${video.video_id}`}
                  title={video.title}
                  artist={video.channel}
                  style={{ 
                    width: '100%', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ 
                  fontWeight: '700', 
                  fontSize: '1.3rem', 
                  marginBottom: '0.5rem',
                  color: '#333',
                  lineHeight: '1.4'
                }}>
                  {video.title}
                </h3>
                <p style={{ 
                  color: '#667eea', 
                  fontSize: '1.1rem', 
                  fontWeight: '500',
                  margin: '0'
                }}>
                  {video.channel}
                </p>
              </div>
              
              <button
                onClick={() => handleLike(video)}
                disabled={liked[video.video_id]}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: liked[video.video_id] 
                    ? 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)'
                    : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  cursor: liked[video.video_id] ? 'default' : 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: liked[video.video_id] ? '0.8' : '1'
                }}
                onMouseEnter={(e) => {
                  if (!liked[video.video_id]) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!liked[video.video_id]) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {liked[video.video_id] ? t('recommendations_liked') : t('recommendations_like')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && !loading && !error && (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem',
          color: '#666',
          fontSize: '1.2rem'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎵</div>
          <p style={{ margin: '0' }}>
            {t('recommendations_search_placeholder')}
          </p>
        </div>
      )}

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

export default Recommendations; 