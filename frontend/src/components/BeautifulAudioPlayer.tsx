import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// IndexedDB helpers (same as original)
const DB_NAME = 'audio-cache-db';
const STORE_NAME = 'audio-files';

function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getCachedAudio(key: string): Promise<Blob | undefined> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function setCachedAudio(key: string, blob: Blob): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(blob, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

interface BeautifulAudioPlayerProps {
  src: string;
  title?: string;
  artist?: string;
  style?: React.CSSProperties;
}

const BeautifulAudioPlayer: React.FC<BeautifulAudioPlayerProps> = ({ 
  src, 
  title = 'Unknown Track', 
  artist = 'Unknown Artist',
  style 
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load audio with cache
  useEffect(() => {
    let revoked = false;
    setLoading(true);
    setError(undefined);
    setAudioUrl(undefined);
    const key = src;
    
    getCachedAudio(key).then(blob => {
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setLoading(false);
      } else {
        fetch(src)
          .then(async r => {
            if (!r.ok) {
              try {
                const data = await r.json();
                if (data && data.error) throw new Error(data.error);
              } catch {}
              throw new Error('Network error');
            }
            return r.blob();
          })
          .then(blob => {
            if (blob.type === 'application/json') {
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const data = JSON.parse(reader.result as string);
                  setError(data.error || 'Failed to load audio');
                } catch {
                  setError('Failed to load audio');
                }
                setLoading(false);
              };
              reader.readAsText(blob);
              return;
            }
            setCachedAudio(key, blob).catch(() => {});
            if (!revoked) {
              const url = URL.createObjectURL(blob);
              setAudioUrl(url);
              setLoading(false);
            }
          })
          .catch((e) => {
            if (!revoked) {
              setError(e.message || 'Error loading audio');
              setLoading(false);
            }
          });
      }
    });
    
    return () => {
      revoked = true;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [src]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        ...style,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '20px',
        color: 'white',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        minHeight: '80px'
      }}>
        <div style={{ 
          width: '24px', 
          height: '24px', 
          border: '3px solid rgba(255,255,255,0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '14px' }}>Loading audio...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        ...style,
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
        borderRadius: '16px',
        padding: '20px',
        color: 'white',
        textAlign: 'center',
        fontSize: '14px',
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        ❌ {error}
      </div>
    );
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ 
      ...style,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '20px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      transition: 'all 0.3s ease'
    }}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Track Info */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ 
          width: '50px',
          height: '50px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          🎵
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontWeight: '600',
            fontSize: '16px',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {title}
          </div>
          <div style={{ 
            opacity: 0.8,
            fontSize: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {artist}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        {/* Time Display */}
        <div style={{ 
          fontSize: '14px',
          fontWeight: '500',
          minWidth: '100px',
          textAlign: 'center'
        }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Volume Control */}
        <div style={{ 
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>
          
          {showVolumeSlider && (
            <div style={{
              position: 'absolute',
              top: '-60px',
              right: '0',
              background: 'rgba(0, 0, 0, 0.8)',
              padding: '10px',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)'
            }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                style={{
                  width: '80px',
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ 
        width: '100%',
        height: '6px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '3px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={handleSeek}
      >
        <div style={{ 
          height: '100%',
          background: 'linear-gradient(90deg, #ffffff 0%, #f0f0f0 100%)',
          borderRadius: '3px',
          width: `${progressPercent}%`,
          transition: 'width 0.1s ease',
          boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
        }} />
        
        {/* Progress indicator */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: `${progressPercent}%`,
          transform: 'translate(-50%, -50%)',
          width: '14px',
          height: '14px',
          background: 'white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          transition: 'left 0.1s ease'
        }} />
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
          }
          
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          }
        `}
      </style>
    </div>
  );
};

export default BeautifulAudioPlayer; 