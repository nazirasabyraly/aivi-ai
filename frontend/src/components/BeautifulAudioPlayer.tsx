import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '@clerk/clerk-react';

interface BeautifulAudioPlayerProps {
    videoId?: string; // Сделаем videoId необязательным
    src?: string; // Добавим прямой URL
    title: string;
    artist: string;
    style?: React.CSSProperties;
    onAudioPlay?: () => void;
    onAudioPause?: () => void;
    authToken?: string; // Добавляем проп для токена
}

const BeautifulAudioPlayer: React.FC<BeautifulAudioPlayerProps> = ({ videoId, src, title, artist, style, onAudioPlay, onAudioPause, authToken }) => {
    const { getToken } = useAuth();
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement>(null);
    const audioUrl = useRef<string | null>(null);

    useEffect(() => {
        const fetchAndSetAudio = async () => {
            if (!videoId) return; // Выходим, если это не YouTube трек

            setIsLoading(true);
            setError(null);

            try {
                // Используем переданный токен, если он есть, иначе получаем новый
                const token = authToken || await getToken();
                if (!token) {
                    throw new Error("Authentication token not available.");
                }

                const response = await fetch(`${API_BASE_URL}/recommend/youtube-audio?video_id=${videoId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 503) {
                    // Специальная обработка для временного отключения
                    setError("Audio playback temporarily unavailable due to YouTube restrictions");
                    setIsLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                audioUrl.current = url;

                if (audioRef.current) {
                    audioRef.current.src = url;
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                console.error("Error loading audio:", errorMessage);
                setError(errorMessage);
                setIsLoading(false);
            }
        };

        if (videoId) {
            fetchAndSetAudio();
        } else if (src && audioRef.current) {
            audioRef.current.src = src;
            setIsLoading(false);
        }

        return () => {
            if (audioUrl.current) {
                URL.revokeObjectURL(audioUrl.current);
            }
        };
    }, [videoId, src, getToken, authToken]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Применяем громкость и Mute при их изменении
        audio.volume = volume;
        audio.muted = isMuted;

        const setAudioData = () => {
            setDuration(audio.duration);
            setCurrentTime(audio.currentTime);
            setIsLoading(false);
        };

        const setAudioTime = () => setCurrentTime(audio.currentTime);
        const handleCanPlay = () => setIsLoading(false);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        
        const handleError = () => {
            setError("Error playing audio.");
            setIsLoading(false);
        };

        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('error', handleError);
        };
    }, [isMuted, volume]); // Добавляем isMuted и volume в зависимости

    const togglePlayPause = () => {
        if (isLoading || error) return;
        const audio = audioRef.current;
        if (audio) {
            if (isPlaying) {
                audio.pause();
                if (onAudioPause) onAudioPause();
            } else {
                audio.play().catch(e => {
                    setError("Playback failed.");
                    console.error("Playback error:", e);
                });
                if (onAudioPlay) onAudioPlay();
            }
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;

        const newVolume = parseFloat(e.target.value);
        audio.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(false); // Выключаем mute при ручной регулировке
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleDownload = async () => {
        if (error || !audioUrl.current) return;
        
        const link = document.createElement('a');
        link.href = audioUrl.current;
        link.download = `${artist} - ${title}.m4a`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="audio-player-container" style={style}>
            <audio ref={audioRef} preload="metadata"></audio>
            
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

            {/* Error Message or Status */}
            {error && (
                <div style={{ 
                    background: 'rgba(255, 193, 7, 0.2)',
                    color: '#fff',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    textAlign: 'center',
                    border: '1px solid rgba(255, 193, 7, 0.3)'
                }}>
                    {error.includes("temporarily unavailable") ? (
                        <>
                            <div style={{ marginBottom: '4px' }}>⚠️ Аудио временно недоступно</div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                YouTube ограничил доступ. Мы работаем над решением.
                            </div>
                        </>
                    ) : (
                        error
                    )}
                </div>
            )}

            {/* Controls */}
            <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '16px'
            }}>
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlayPause}
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        border: 'none',
                        background: error ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontSize: '20px',
                        cursor: error ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(10px)',
                        opacity: error ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!error) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!error) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }
                    }}
                    disabled={isLoading || !!error}
                >
                    {isLoading ? (
                        <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            border: '3px solid rgba(255,255,255,0.3)',
                            borderTop: '3px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                    ) : error ? '❌' : isPlaying ? '⏸️' : '▶️'}
                </button>

                {/* Time Display */}
                <div style={{ 
                    fontSize: '14px',
                    fontWeight: '500',
                    minWidth: '100px',
                    textAlign: 'center',
                    opacity: error ? 0.5 : 1
                }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* Volume Control */}
                <div style={{ 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: error ? 0.5 : 1
                }}>
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            fontSize: '16px',
                            cursor: error ? 'not-allowed' : 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (!error) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!error) {
                                e.currentTarget.style.background = 'none';
                            }
                        }}
                        disabled={!!error}
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                    
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        disabled={!!error}
                        style={{
                            width: '80px',
                            height: '4px',
                            background: '#e5e7eb',
                            borderRadius: '2px',
                            outline: 'none',
                            cursor: error ? 'not-allowed' : 'pointer',
                            opacity: error ? 0.5 : 1
                        }}
                    />
                </div>

                {/* Download Button */}
                <button
                    onClick={handleDownload}
                    style={{
                        background: error ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        color: 'white',
                        fontSize: '16px',
                        cursor: error ? 'not-allowed' : 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(10px)',
                        opacity: error ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!error) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!error) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }
                    }}
                    title={error ? "Скачивание недоступно" : "Скачать музыку"}
                    disabled={!!error}
                >
                    📥
                </button>
            </div>

            {/* Progress Bar */}
            <div style={{ 
                width: '100%',
                height: '6px',
                background: '#e5e7eb',
                borderRadius: '3px',
                cursor: error ? 'not-allowed' : 'pointer',
                position: 'relative',
                overflow: 'hidden',
                opacity: error ? 0.5 : 1
            }}
            onClick={error ? undefined : handleSeek}
            >
                <div style={{ 
                    height: '100%',
                    background: error ? 'rgba(255, 255, 255, 0.3)' : 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
                    borderRadius: '3px',
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    transition: 'width 0.1s ease',
                    boxShadow: error ? 'none' : '0 0 10px rgba(59, 130, 246, 0.5)'
                }} />
                
                {/* Progress indicator */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '14px',
                    height: '14px',
                    background: error ? 'rgba(255, 255, 255, 0.5)' : '#3b82f6',
                    borderRadius: '50%',
                    boxShadow: error ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.3)',
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
                        background: #3b82f6;
                        border-radius: 50%;
                        cursor: pointer;
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                    }
                    
                    input[type="range"]::-moz-range-thumb {
                        width: 16px;
                        height: 16px;
                        background: #3b82f6;
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