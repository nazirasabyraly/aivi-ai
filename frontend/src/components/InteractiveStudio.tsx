import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL, handleTokenExpiration, checkTokenValidity } from '../config';
import { useTranslation } from 'react-i18next';
import BeautifulAudioPlayer from './BeautifulAudioPlayer';
import './InteractiveStudio.css';

interface MoodAnalysis {
  mood: string;
  description: string;
  emotions: string[];
  energy_level: number;
  valence: number;
  danceability: number;
  tempo: number;
  genres: string[];
}

interface Recommendation {
  name: string;
  artist: string;
  reason: string;
}

interface RecommendationData {
  recommended_tracks: Recommendation[];
  explanation: string;
  alternative_genres?: string[];
}

interface BeatsData {
  generatedBeatUrl?: string;
  generatingBeat: boolean;
  beatRequestId?: string;
  generationMessage?: string;
  generationProgress?: number;
}

const InteractiveStudio: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [moodAnalysis, setMoodAnalysis] = useState<MoodAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<{
    global: RecommendationData;
    personal: RecommendationData;
  } | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [beatsData, setBeatsData] = useState<BeatsData>({
    generatingBeat: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'upload' | 'analysis' | 'recommendations' | 'beats'>('upload');
  const [liked, setLiked] = useState<{ [key: string]: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeRecommendationTab, setActiveRecommendationTab] = useState<'personal' | 'global'>('personal');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Helper function to get YouTube video ID (simplified search)
  // Кеш для YouTube видео
  const [youtubeCache, setYoutubeCache] = useState<{ [key: string]: string }>({});
  const [loadingVideos, setLoadingVideos] = useState<{ [key: string]: boolean }>({});
  
  // Функция проверки лимита пользователя
  const checkUserLimit = async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('⚠️ Для анализа медиафайлов необходима авторизация. Нажмите "Выйти" в левом верхнем углу и войдите в систему.');
      return false; // Блокируем неавторизованных пользователей
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        
        // Если PRO пользователь - безлимитный доступ
        if (profile.account_type === 'pro') {
          return true;
        }
        
        // Если обычный пользователь - проверяем лимит
        if (profile.remaining_analyses > 0) {
          return true;
        } else {
          setShowLimitModal(true);
          return false;
        }
      }
    } catch (error) {
      console.error('Error checking user limit:', error);
    }
    
    return true; // В случае ошибки разрешаем
  };

  const getYouTubeVideoId = async (trackName: string, artistName: string): Promise<string> => {
    const cacheKey = `${trackName}-${artistName}`;
    
    // Проверяем кеш
    if (youtubeCache[cacheKey]) {
      return youtubeCache[cacheKey];
    }
    
    try {
      const query = `${trackName} ${artistName}`;
      const response = await fetch(`${API_BASE_URL}/recommend/youtube-search?q=${encodeURIComponent(query)}&max_results=1`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const videoId = data.results[0].video_id;
        setYoutubeCache(prev => ({ ...prev, [cacheKey]: videoId }));
        return videoId;
      }
    } catch (error) {
      console.error('Error fetching YouTube video:', error);
    }
    
    // Fallback к демо видео если поиск не удался
    const fallbackVideoIds = [
      'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
      'fJ9rUzIMcZQ', // Queen - Bohemian Rhapsody
      'kJQP7kiw5Fk', // Despacito
    ];
    
    const hash = (trackName + artistName).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const fallbackId = fallbackVideoIds[Math.abs(hash) % fallbackVideoIds.length];
    setYoutubeCache(prev => ({ ...prev, [cacheKey]: fallbackId }));
    return fallbackId;
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Предзагрузка YouTube видео при получении рекомендаций
  useEffect(() => {
    if (recommendations) {
      const loadVideos = async () => {
        const allTracks = [
          ...(recommendations.personal?.recommended_tracks || []),
          ...(recommendations.global?.recommended_tracks || [])
        ];

        for (const track of allTracks) {
          const cacheKey = `${track.name}-${track.artist}`;
          if (!youtubeCache[cacheKey] && !loadingVideos[cacheKey]) {
            setLoadingVideos(prev => ({ ...prev, [cacheKey]: true }));
            try {
              await getYouTubeVideoId(track.name, track.artist);
            } catch (error) {
              console.error('Error loading video for', track.name, track.artist, error);
            } finally {
              setLoadingVideos(prev => ({ ...prev, [cacheKey]: false }));
            }
          }
        }
      };

      loadVideos();
    }
  }, [recommendations]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setSuccess(null);
    setActiveSection('upload');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const analyzeMedia = async () => {
    if (!selectedFile) return;

    // Проверяем лимит пользователя
    const canAnalyze = await checkUserLimit();
    if (!canAnalyze) {
      return; // Лимит исчерпан, показано модальное окно
    }

    setAnalyzing(true);
    setError(null);
    setActiveSection('analysis');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('language', i18n.language);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/chat/analyze-media`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMoodAnalysis(data);
        setSuccess(t('studio_analysis_success'));
        setActiveSection('analysis');
        
        // Обновляем информацию о пользователе после успешного анализа
        await checkUserLimit();
        
        // Auto-scroll to analysis results
        setTimeout(() => {
          if (analysisRef.current) {
            analysisRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 100);
      } else {
        setError(data.detail || 'Failed to analyze media');
      }
    } catch (error) {
      setError('Error analyzing media');
    } finally {
      setAnalyzing(false);
    }
  };

  const getRecommendations = async () => {
    if (!moodAnalysis) return;

    setLoadingRecommendations(true);
    setError(null);
    setActiveSection('recommendations');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/chat/get-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...moodAnalysis,
          language: i18n.language
        }),
      });

      if (response.status === 401) {
        handleTokenExpiration();
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setRecommendations(data);
        setSuccess(t('studio_recommendations_success'));
        
        // Auto-scroll to recommendations
        setTimeout(() => {
          if (recommendationsRef.current) {
            recommendationsRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 100);
      } else {
        setError(data.detail || 'Failed to get recommendations');
      }
    } catch (error) {
      setError('Error getting recommendations');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Массив сообщений для прогресса генерации
  const generationMessages = [
    "🎵 Начинается работа над песней...",
    "🎼 Анализируем ваше настроение...",
    "🎹 Создаем мелодию...",
    "🥁 Добавляем ритм...",
    "🎸 Настраиваем инструменты...",
    "🎤 Микшируем звук...",
    "⏰ Осталось совсем немного...",
    "🎉 Финальная обработка..."
  ];

  // Функция для плавного обновления прогресса
  const startProgressUpdates = () => {
    let messageIndex = 0;
    let progress = 0;
    
    const interval = setInterval(() => {
      if (!beatsData.generatingBeat) {
        clearInterval(interval);
        return;
      }
      
      // Обновляем сообщение каждые 8 секунд
      if (progress % 8 === 0 && messageIndex < generationMessages.length - 1) {
        messageIndex++;
        setBeatsData(prev => ({
          ...prev,
          generationMessage: generationMessages[messageIndex]
        }));
      }
      
      // Увеличиваем прогресс на 1% каждую секунду, максимум до 90%
      if (progress < 90) {
        progress += 1;
        setBeatsData(prev => ({
          ...prev,
          generationProgress: progress
        }));
      }
      
      progress++;
    }, 1000); // Обновляем каждую секунду
  };

  const generateBeat = async () => {
    if (!moodAnalysis) return;

    setBeatsData(prev => ({ 
      ...prev, 
      generatingBeat: true,
      generationMessage: generationMessages[0],
      generationProgress: 0
    }));
    setError(null);
    setActiveSection('beats');

    try {
      const prompt = `${moodAnalysis.mood} ${moodAnalysis.description} ${moodAnalysis.emotions.join(' ')}`;
      
      const response = await fetch(`${API_BASE_URL}/chat/generate-beat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          mood_analysis: moodAnalysis,
        }),
      });

      const data = await response.json();
      console.log('🎵 Generate beat response:', data);

      if (response.ok) {
        if (data.request_id) {
          setBeatsData(prev => ({ 
            ...prev, 
            beatRequestId: data.request_id,
            generatingBeat: true 
          }));
          
          // Запускаем обновление сообщений независимо от polling
          startProgressUpdates();
          
          // Poll for completion
          pollGenerationStatus(data.request_id);
        } else if (data.audio_url) {
          // Прямой результат
          setBeatsData(prev => ({
            ...prev,
            generatedBeatUrl: `${API_BASE_URL}${data.audio_url}`,
            generatingBeat: false,
            generationMessage: "✅ Песня готова!",
            generationProgress: 100
          }));
          setSuccess(t('studio_beat_ready'));
          setActiveSection('beats');
        } else {
          setError(data.message || 'Неожиданный ответ от сервера');
          setBeatsData(prev => ({ ...prev, generatingBeat: false }));
        }
      } else {
        setError(data.detail || 'Failed to generate beat');
        setBeatsData(prev => ({ ...prev, generatingBeat: false }));
      }
    } catch (error) {
      setError('Error generating beat');
      setBeatsData(prev => ({ ...prev, generatingBeat: false }));
    }
  };

  const pollGenerationStatus = async (requestId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    // Функция для обновления прогресса (теперь только для финального этапа)
    const updateProgress = (attemptNumber: number) => {
      // Только обновляем до 95% если прогресс еще не достиг этого значения
      const progress = Math.min((attemptNumber / maxAttempts) * 100, 95);
      
      setBeatsData(prev => ({
        ...prev,
        generationProgress: Math.max(prev.generationProgress || 0, progress)
      }));
    };

    const poll = async () => {
      try {
        // Обновляем прогресс перед каждым запросом
        updateProgress(attempts);
        
        console.log(`🔄 Polling status for request_id: ${requestId}, attempt: ${attempts + 1}`);
        
        const response = await fetch(`${API_BASE_URL}/chat/generate-beat/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ request_id: requestId }),
        });

        console.log(`📡 Status response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Status request failed: ${response.status} - ${errorText}`);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('🎵 Generation status response:', data);

        if (data.success && data.status) {
          const status = data.status.status;
          
          if (status === 'complete') {
            // Extract audio URL from the nested structure
            let audioUrl: string | null = null;
            
            // Try local_audio_url first (from backend processing)
            if (data.status.local_audio_url) {
              audioUrl = `${API_BASE_URL}${data.status.local_audio_url}`;
            }
            // Try stream_audio_url from the nested data structure
            else if (data.status.data?.data?.[0]?.stream_audio_url) {
              audioUrl = data.status.data.data[0].stream_audio_url;
            }
            // Try direct stream_audio_url
            else if (data.status.stream_audio_url) {
              audioUrl = data.status.stream_audio_url;
            }
            
            console.log('Extracted audio URL:', audioUrl);
            
            if (audioUrl) {
              setBeatsData(prev => ({
                ...prev,
                generatedBeatUrl: audioUrl,
                generatingBeat: false,
                generationMessage: "✅ Песня готова!",
                generationProgress: 100
              }));
              setSuccess(t('studio_beat_ready'));
              setActiveSection('beats');
              return;
            } else {
              console.error('No audio URL found in response:', data.status);
              setError('Audio URL not found in response');
              setBeatsData(prev => ({ ...prev, generatingBeat: false }));
              return;
            }
          } else if (status === 'failed') {
            setError(t('studio_beat_failed'));
            setBeatsData(prev => ({ ...prev, generatingBeat: false }));
            return;
          } else if (status === 'pending') {
            // Continue polling
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setError(t('studio_beat_timeout'));
          setBeatsData(prev => ({ ...prev, generatingBeat: false }));
        }
      } catch (error) {
        console.error('Error polling generation status:', error);
        setError(t('studio_beat_status_error'));
        setBeatsData(prev => ({ ...prev, generatingBeat: false }));
      }
    };

    poll();
  };

  const handleLike = async (track: string, artist: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('Authentication required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/media/saved-songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          youtube_video_id: `search:${track}-${artist}`,
          title: track,
          artist: artist
        })
      });

      if (response.ok) {
        setLiked(prev => ({ ...prev, [`${track}-${artist}`]: true }));
        setSuccess('Added to favorites!');
      } else if (response.status === 409) {
        // Песня уже сохранена
        setLiked(prev => ({ ...prev, [`${track}-${artist}`]: true }));
        setError('Эта песня уже сохранена в избранном');
      } else {
        setError('Failed to add to favorites');
      }
    } catch (error) {
      setError('Error adding to favorites');
    }
  };

  const resetAll = () => {
    setSelectedFile(null);
    setMoodAnalysis(null);
    setRecommendations(null);
    setBeatsData({ generatingBeat: false });
    setError(null);
    setSuccess(null);
    setActiveSection('upload');
    setLiked({});
  };

  const handleUpgrade = () => {
    // TODO: Реализовать логику перехода на PRO
    alert('Функция перехода на PRO будет реализована позже');
    setShowLimitModal(false);
  };

  const handleCloseLimitModal = () => {
    setShowLimitModal(false);
  };

  return (
    <div className="studio-container">
      <div className="studio-header">
        <h1>🎵 {t('studio_main_title')}</h1>
        <p>{t('studio_main_subtitle')}</p>
      </div>

      {/* Messages */}
      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">{success}</div>}

      {/* Progress Steps */}
      <div className="progress-steps">
        <div className={`step ${activeSection === 'upload' ? 'active' : selectedFile ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">{t('studio_upload_title')}</div>
        </div>
        <div className={`step ${activeSection === 'analysis' ? 'active' : moodAnalysis ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">{t('studio_mood_title')}</div>
        </div>
        <div className={`step ${activeSection === 'recommendations' ? 'active' : recommendations ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">{t('studio_recommendations_title')}</div>
        </div>
        <div className={`step ${activeSection === 'beats' ? 'active' : beatsData.generatedBeatUrl ? 'completed' : ''}`}>
          <div className="step-number">4</div>
          <div className="step-label">{t('studio_beat_title')}</div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="section">
        <div className="section-header">
          <h2>📤 {t('studio_upload_title')}</h2>
          <p>{t('studio_upload_description')}</p>
        </div>
        
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          
          {selectedFile ? (
            <div className="file-preview">
              <div className="file-icon">📄</div>
              <div className="file-info">
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            </div>
          ) : (
            <div className="upload-placeholder">
              <div className="upload-icon">📁</div>
              <div className="upload-text">
                <strong>{t('studio_upload_click')}</strong> {t('studio_upload_drag')}
              </div>
              <div className="upload-hint">{t('studio_upload_hint')}</div>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="upload-actions">
            <button 
              onClick={analyzeMedia} 
              disabled={analyzing}
              className="btn btn-primary"
            >
              {analyzing ? t('studio_analyzing') : t('studio_analyze')}
            </button>
            <button onClick={resetAll} className="btn btn-secondary">
              {t('studio_reset')}
            </button>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {moodAnalysis && (
        <div className="section" ref={analysisRef}>
          <div className="section-header">
            <h2>🎭 {t('studio_mood_title')}</h2>
            <p>{t('studio_mood_description')}</p>
          </div>
          
          <div className="analysis-grid">
            <div className="analysis-card">
              <h3>{t('studio_primary_mood')}</h3>
              <div className="mood-badge">{moodAnalysis.mood}</div>
              <p>{moodAnalysis.description}</p>
            </div>
            
            <div className="analysis-card">
              <h3>{t('studio_emotions')}</h3>
              <div className="emotions-list">
                {moodAnalysis.emotions.map((emotion, index) => (
                  <span key={index} className="emotion-tag">{emotion}</span>
                ))}
              </div>
            </div>
            
            <div className="analysis-card">
              <h3>{t('studio_musical_attributes')}</h3>
              <div className="attributes">
                <div className="attribute">
                  <span>{t('studio_energy')}</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${moodAnalysis.energy_level * 100}%` }}></div>
                  </div>
                </div>
                <div className="attribute">
                  <span>{t('studio_valence')}</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${moodAnalysis.valence * 100}%` }}></div>
                  </div>
                </div>
                <div className="attribute">
                  <span>{t('studio_danceability')}</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${moodAnalysis.danceability * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="analysis-actions">
            <button 
              onClick={getRecommendations} 
              disabled={loadingRecommendations}
              className="btn btn-primary"
            >
              {loadingRecommendations ? t('studio_getting_recommendations') : t('studio_get_recommendations')}
            </button>
            <button 
              onClick={generateBeat} 
              disabled={beatsData.generatingBeat}
              className="btn btn-secondary"
            >
              {beatsData.generatingBeat ? t('studio_generating_beat') : t('studio_generate_beat')}
            </button>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && (
        <div className="section" ref={recommendationsRef}>
          <div className="section-header">
            <h2>🎵 {t('studio_recommendations_title')}</h2>
            <p>{t('studio_recommendations_description')}</p>
          </div>
          
          <div className="recommendations-tabs">
            <div className="tab-headers">
              <button 
                className={`tab-header ${activeRecommendationTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveRecommendationTab('personal')}
              >
                {t('studio_personal_tab')}
              </button>
              <button 
                className={`tab-header ${activeRecommendationTab === 'global' ? 'active' : ''}`}
                onClick={() => setActiveRecommendationTab('global')}
              >
                {t('studio_global_tab')}
              </button>
            </div>
            
            <div className="recommendations-grid">
              {recommendations[activeRecommendationTab].recommended_tracks.map((rec, index) => {
                const cacheKey = `${rec.name}-${rec.artist}`;
                const videoId = youtubeCache[cacheKey];
                const isLoadingVideo = loadingVideos[cacheKey];
                
                return (
                  <div key={index} className="recommendation-card">
                    <div className="rec-header">
                      <h4>{rec.name}</h4>
                      <p>{rec.artist}</p>
                    </div>
                    <p className="rec-reason">{rec.reason}</p>
                    
                    {/* YouTube Video */}
                    <div className="youtube-container">
                      {isLoadingVideo ? (
                        <div style={{ 
                          width: '100%', 
                          height: '200px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '8px'
                        }}>
                          <div>🔍 Поиск видео...</div>
                        </div>
                      ) : videoId ? (
                        <iframe
                          width="100%"
                          height="200"
                          src={`https://www.youtube.com/embed/${videoId}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={`${rec.name} - ${rec.artist}`}
                        ></iframe>
                      ) : (
                        <div style={{ 
                          width: '100%', 
                          height: '200px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '8px'
                        }}>
                          <div>❌ Видео не найдено</div>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleLike(rec.name, rec.artist)}
                      disabled={liked[`${rec.name}-${rec.artist}`]}
                      className={`btn btn-like ${liked[`${rec.name}-${rec.artist}`] ? 'liked' : ''}`}
                    >
                      {liked[`${rec.name}-${rec.artist}`] ? `❤️ ${t('studio_liked')}` : `🤍 ${t('studio_like')}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Beat Generation */}
      {(beatsData.generatingBeat || beatsData.generatedBeatUrl) && (
        <div className="section">
          <div className="section-header">
            <h2>🎹 {t('studio_beat_title')}</h2>
            <p>{t('studio_beat_description')}</p>
          </div>
          
          <div className="beat-card">
            {beatsData.generatingBeat ? (
              <div className="generating-beat">
                <div className="beat-spinner"></div>
                <h3>{beatsData.generationMessage || t('studio_beat_generating')}</h3>
                <div className="generation-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${beatsData.generationProgress || 0}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{Math.round(beatsData.generationProgress || 0)}%</span>
                </div>
                <p>{t('studio_beat_wait')}</p>
              </div>
            ) : beatsData.generatedBeatUrl ? (
              <div className="generated-beat">
                <h3>{t('studio_beat_ready')}</h3>
                <BeautifulAudioPlayer 
                  src={beatsData.generatedBeatUrl}
                  title={t('studio_beat_title')}
                  artist="AI Generated"
                  style={{ width: '100%', marginTop: '16px' }}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Модальное окно лимита */}
      {showLimitModal && (
        <div className="modal-overlay" onClick={handleCloseLimitModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ {t('limit_exceeded_title') || 'Лимит исчерпан'}</h2>
              <button className="modal-close" onClick={handleCloseLimitModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                {t('limit_exceeded_message') || 
                'У вас исчерпан лимит анализов на сегодня (3/3). Вы можете:'
                }
              </p>
              <ul>
                <li>{t('wait_tomorrow') || 'Подождать до завтра (лимит обновится в 00:00)'}</li>
                <li>{t('upgrade_for_unlimited') || 'Перейти на PRO для безлимитных анализов'}</li>
              </ul>
              {userProfile && (
                <div className="usage-info-modal">
                  <p><strong>{t('current_usage') || 'Текущее использование'}:</strong> {userProfile.daily_usage}/3</p>
                  <p><strong>{t('account_type') || 'Тип аккаунта'}:</strong> {userProfile.account_type}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn-upgrade-modal"
                onClick={handleUpgrade}
              >
                ⭐ {t('upgrade_to_pro') || 'UPGRADE TO PRO'}
              </button>
              <button 
                className="btn-cancel-modal"
                onClick={handleCloseLimitModal}
              >
                {t('wait_tomorrow') || 'Подождать до завтра'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveStudio; 