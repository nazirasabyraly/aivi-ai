import React, { useEffect, useRef, useState } from 'react';

// IndexedDB helpers
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

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) || window.innerWidth < 600;
}

interface AudioWithCacheProps {
  src: string; // mp3 url
  style?: React.CSSProperties;
}

const AudioWithCache: React.FC<AudioWithCacheProps> = ({ src, style }) => {
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement>(null);

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
              // Пробуем прочитать ошибку из JSON
              try {
                const data = await r.json();
                if (data && data.error) throw new Error(data.error);
              } catch {}
              throw new Error('Network error');
            }
            return r.blob();
          })
          .then(blob => {
            // Если это JSON с ошибкой, не кэшируем
            if (blob.type === 'application/json') {
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const data = JSON.parse(reader.result as string);
                  setError(data.error || 'Не удалось скачать аудио.');
                } catch {
                  setError('Не удалось скачать аудио.');
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
              setError(e.message || 'Ошибка загрузки аудио');
              setLoading(false);
            }
          });
      }
    });
    return () => {
      revoked = true;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line
  }, [src]);

  // Индикатор загрузки
  if (loading) {
    return <div style={{ width: style?.width || 220, textAlign: 'center', padding: 12 }}>
      <span className="loading-dots"><span></span><span></span><span></span></span>
      <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>Загрузка аудио...</div>
    </div>;
  }
  if (error) {
    return <div style={{ color: 'red', fontSize: 14 }}>{error}</div>;
  }
  // Только аудио для мобильных
  if (isMobileDevice()) {
    return <audio ref={audioRef} controls src={audioUrl} style={style} />;
  }
  // Для десктопа — просто аудио (видео/iframe добавляется снаружи)
  return <audio ref={audioRef} controls src={audioUrl} style={style} />;
};

export default AudioWithCache; 