import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { API_BASE_URL } from '../config';

interface BeautifulAudioPlayerProps {
    videoId: string;
    title: string;
    artist: string;
    style?: React.CSSProperties;
}

const BeautifulAudioPlayer: React.FC<BeautifulAudioPlayerProps> = ({ videoId, title, artist, style }) => {
    const src = `${API_BASE_URL}/recommend/youtube-audio?video_id=${videoId}`;
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const setAudioData = () => {
                setDuration(audio.duration);
                setCurrentTime(audio.currentTime);
            };

            const setAudioTime = () => setCurrentTime(audio.currentTime);

            const handleCanPlay = () => {
                setIsLoading(false);
            };

            const handleError = () => {
                setIsLoading(false);
                console.error("Error loading audio");
            };

            audio.addEventListener('loadeddata', setAudioData);
            audio.addEventListener('timeupdate', setAudioTime);
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('error', handleError);

            if (audio.readyState >= 2) {
                handleCanPlay();
            }

            return () => {
                audio.removeEventListener('loadeddata', setAudioData);
                audio.removeEventListener('timeupdate', setAudioTime);
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('error', handleError);
            };
        }
    }, [src]);

    const togglePlayPause = () => {
        if (isLoading) return;
        const audio = audioRef.current;
        if (audio) {
            if (isPlaying) {
                audio.pause();
            } else {
                audio.play();
            }
            setIsPlaying(!isPlaying);
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
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleDownload = () => {
        // Извлекаем имя файла из URL
        const urlParts = src.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        // Создаем ссылку для скачивания
        const downloadUrl = src.replace('/audio_cache/', '/chat/download-beat/');
        
        // Создаем временную ссылку и кликаем по ней
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `aivi_generated_music_${filename}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="audio-player-container" style={style}>
            <audio ref={audioRef} src={src} preload="metadata"></audio>
            
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
                    onClick={togglePlayPause}
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
                    disabled={isLoading}
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
                    ) : isPlaying ? '⏸️' : '▶️'}
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
                        onClick={() => setIsMuted(!isMuted)}
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
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                    
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

                {/* Download Button */}
                <button
                    onClick={handleDownload}
                    style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        color: 'white',
                        fontSize: '16px',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(10px)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    }}
                    title="Скачать музыку"
                >
                    ��
                </button>
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
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    transition: 'width 0.1s ease',
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                }} />
                
                {/* Progress indicator */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${duration ? (currentTime / duration) * 100 : 0}%`,
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