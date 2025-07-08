import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL, handleTokenExpiration, checkTokenValidity } from '../config';
import './Chat.css';
import { useTranslation } from 'react-i18next';
import AudioWithCache from './AudioWithCache';

declare global {
  interface Window {
    YT?: any;
    [key: string]: any;
  }
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  mediaUrl?: string;
  moodAnalysis?: any;
  recommendations?: any;
  generatedBeatUrl?: string;
}

interface ChatProps {
  userPreferences?: any;
}

const AI_LANGUAGES = [
  { code: 'ru', label: 'Русский', prompt: 'Пожалуйста, отвечай мне только на русском языке.' },
  { code: 'en', label: 'English', prompt: 'Please reply to the user only in English.' },
  { code: 'kz', label: 'Қазақша', prompt: 'Пайдаланушыға тек қазақ тілінде жауап бер.' },
];

const Chat: React.FC<ChatProps> = ({ userPreferences }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [currentMoodAnalysis, setCurrentMoodAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [mediaDescription, setMediaDescription] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [aiLang, setAiLang] = useState(() => localStorage.getItem('ai_lang') || 'ru');
  const aiLangObj = AI_LANGUAGES.find(l => l.code === aiLang) || AI_LANGUAGES[0];
  const [youtubeCache, setYoutubeCache] = useState<{ [key: string]: { videoId: string, url: string } }>({});
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [manualLinks, setManualLinks] = useState('');
  const [manualTracks, setManualTracks] = useState<string[]>([]);
  const [generatingBeat, setGeneratingBeat] = useState(false);
  const [clearChatError, setClearChatError] = useState<string | null>(null);
  const [clearChatSuccess, setClearChatSuccess] = useState<boolean>(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  // Функция проверки лимита пользователя
  const checkUserLimit = async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token');
    if (!token) return false; // Блокируем неавторизованных пользователей

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

  const getYoutubeEmbedUrl = (videoId: string, startMs?: number) => {
    if (!videoId) return '';
    const startSec = startMs ? Math.floor(startMs / 1000) : 0;
    return `https://www.youtube.com/embed/${videoId}${startSec ? `?start=${startSec}` : ''}`;
  };
  const embedRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({});

  const apiBaseUrl = API_BASE_URL;

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Загружаем историю чата с backend при загрузке
  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      
      // Проверяем валидность токена
      const isValid = await checkTokenValidity();
      if (!isValid) return;
      
      try {
        const resp = await fetch(`${API_BASE_URL}/chat/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.length === 0) {
            // Если история пуста — приветствие
            setMessages([{
              id: '1',
              type: 'ai' as const,
              content:
                aiLang === 'en'
                  ? "Hello! I'm your music assistant. Send me a photo or video, and I'll analyze the mood and suggest suitable music! 🎵"
                  : aiLang === 'kz'
                  ? "Сәлем! Мен сенің музыкалық көмекшіңмін. Маған фото немесе видео жібер, мен көңіл-күйді талдап, лайықты музыка ұсынамын! 🎵"
                  : "Привет! Я твой музыкальный помощник. Отправь мне фото или видео, и я проанализирую настроение и подберу подходящую музыку! 🎵",
              timestamp: new Date()
            }]);
          } else {
            setMessages(data.map((msg: any) => ({
              id: String(msg.id),
              type: msg.role === 'ai' ? 'ai' : 'user',
              content: msg.content,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
              mediaUrl: msg.media_url || undefined
            })));
          }
        } else if (resp.status === 401) {
          handleTokenExpiration();
        }
      } catch (error) {
        console.error('Ошибка загрузки истории:', error);
      }
    };
    fetchHistory();
    // eslint-disable-next-line
  }, [aiLang]);

  // Периодическая проверка токена каждые 5 минут
  useEffect(() => {
    const tokenCheckInterval = setInterval(async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await checkTokenValidity();
      }
    }, 5 * 60 * 1000); // 5 минут

    return () => clearInterval(tokenCheckInterval);
  }, []);

  // Сохраняем новое сообщение в backend
  const saveMessageToBackend = async (msg: Message) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chat/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: msg.type,
          content: msg.content,
          media_url: msg.mediaUrl || null,
          timestamp: msg.timestamp
        })
      });
      
      if (response.status === 401) {
        handleTokenExpiration();
      }
    } catch (error) {
      console.error('Ошибка сохранения сообщения:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    saveMessageToBackend(userMessage);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/chat/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          mood_analysis: currentMoodAnalysis,
          system_prompt: aiLangObj.prompt
        })
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        saveMessageToBackend(aiMessage);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      saveMessageToBackend(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowDescriptionInput(true);
  };

  const handleSendFileWithDescription = async () => {
    if (!pendingFile) return;

    // Проверяем лимит пользователя
    const canAnalyze = await checkUserLimit();
    if (!canAnalyze) {
      setShowDescriptionInput(false);
      setPendingFile(null);
      setMediaDescription('');
      return; // Лимит исчерпан, показано модальное окно
    }

    setUploadingFile(true);
    setShowDescriptionInput(false);
    try {
      const mediaUrl = URL.createObjectURL(pendingFile);
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: mediaDescription || '',
        timestamp: new Date(),
        mediaUrl
      };
      setMessages(prev => [...prev, userMessage]);
      saveMessageToBackend(userMessage);
      // Анализируем медиафайл
      const formData = new FormData();
      formData.append('file', pendingFile);
      if (mediaDescription) formData.append('description', mediaDescription);
      console.log('🚀 Отправляем запрос на анализ...');
      const token = localStorage.getItem('auth_token');
      const analysisResponse = await fetch(`${apiBaseUrl}/chat/analyze-media`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });
      console.log('📡 Получен ответ:', analysisResponse.status, analysisResponse.statusText);
      const analysisData = await analysisResponse.json();
      console.log('📊 Данные анализа:', analysisData);
      if (analysisData.success) {
        setCurrentMoodAnalysis(analysisData);
        // Формируем красивый текст анализа
        let mood = analysisData.mood || (analysisData.description && analysisData.description.mood) || '-';
        let emotions = analysisData.emotions || (analysisData.description && analysisData.description.emotions) || [];
        let genre = analysisData.music_genre || (analysisData.description && analysisData.description.music_genre) || '-';
        let colors = analysisData.colors || (analysisData.description && analysisData.description.colors) || '-';
        let description = analysisData.description;
        let caption = analysisData.caption || (typeof description === 'object' && description.caption) || '';
        // Если description — это объект, берем из него текстовое описание
        let descriptionText = typeof description === 'object' && description.description ? description.description : (typeof description === 'string' ? description : '');
        const analysisMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content:
            `<div><strong>🎨 Анализ настроения:</strong></div>` +
            `<div><b>Настроение:</b> ${mood}</div>` +
            `<div><b>Эмоции:</b> ${Array.isArray(emotions) ? emotions.join(', ') : emotions || '-'}</div>` +
            `<div><b>Жанр музыки:</b> ${genre}</div>` +
            `<div><b>Цвета:</b> ${colors}</div>` +
            (descriptionText ? `<div><b>Описание:</b> ${descriptionText}</div>` : '') +
            (caption ? `<div style='margin-top:8px;'><b>💡 Предлагаю описание для вашего поста:</b><br><i>«${caption}»</i></div>` : '') +
            `<div style='margin-top:8px;'>Теперь я подберу для тебя музыку!</div>`,
          timestamp: new Date(),
          moodAnalysis: analysisData
        };
        setMessages(prev => [...prev, analysisMessage]);
        saveMessageToBackend(analysisMessage);
        
        // Обновляем информацию о пользователе после успешного анализа
        await checkUserLimit();
        
        // Получаем рекомендации
        const payload = analysisData && typeof analysisData === 'object' ? analysisData : { mood: 'neutral' };
        const recommendationsResponse = await fetch(`${apiBaseUrl}/chat/get-recommendations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } : {})
          },
          body: JSON.stringify(payload)
        });
        const recommendationsData = await recommendationsResponse.json();
        const recommendationsMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: `🎵 Музыкальные рекомендации:`,
          timestamp: new Date(),
          recommendations: {
            personal: recommendationsData.personal,
            global: recommendationsData.global,
            ask_feedback: recommendationsData.ask_feedback
          },
          moodAnalysis: analysisData
        };
        setMessages(prev => [...prev, recommendationsMessage]);
        saveMessageToBackend(recommendationsMessage);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `Ошибка анализа файла: ${analysisData.error || 'Неизвестная ошибка'}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        saveMessageToBackend(errorMessage);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Извините, произошла ошибка при анализе файла. Попробуйте еще раз.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      saveMessageToBackend(errorMessage);
    } finally {
      setUploadingFile(false);
      setPendingFile(null);
      setMediaDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content: string) => {
    // Простое форматирование markdown
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  };

  const formatTime = (ms?: number) => {
    if (!ms) return '0:00';
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Функция поиска YouTube-видео по названию и артисту
  const fetchYoutubeVideo = async (trackName: string, artist: string) => {
    const key = `${trackName}__${artist}`;
    if (youtubeCache[key]) return youtubeCache[key];
    try {
      const resp = await fetch(`${API_BASE_URL}/recommend/youtube-search?q=${encodeURIComponent(trackName + ' ' + artist)}&max_results=1`);
      const data = await resp.json();
      if (data.error && data.error.includes('quota')) {
        setQuotaExceeded(true);
      }
      if (data.results && data.results.length > 0) {
        const videoId = data.results[0].video_id;
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        setYoutubeCache(prev => ({ ...prev, [key]: { videoId, url } }));
        return { videoId, url };
      }
    } catch {}
    setYoutubeCache(prev => ({ ...prev, [key]: { videoId: '', url: '' } }));
    return { videoId: '', url: '' };
  };

  // Fetch YouTube videos for recommendations when they are loaded
  useEffect(() => {
    const fetchVideosForRecommendations = async () => {
      messages.forEach(message => {
        if (message.recommendations) {
          ['personal', 'global'].forEach(type => {
            if (message.recommendations[type]?.recommended_tracks) {
              message.recommendations[type].recommended_tracks.forEach((track: any) => {
                const key = `${type}__${track.name}__${track.artist}`;
                if (!youtubeCache[key]) {
                  fetchYoutubeVideo(track.name, track.artist);
                }
              });
            }
          });
        }
      });
    };
    
    fetchVideosForRecommendations();
  }, [messages, youtubeCache]);

  // YouTube iFrame API — подключаем один раз
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
  }, []);

  // Функция для воспроизведения сегмента YouTube
  const playSegment = (playerId: string, videoId: string, start: number, end: number) => {
    if (!window.YT || !window.YT.Player) return;
    if (!window[`ytPlayer_${playerId}`]) {
      window[`ytPlayer_${playerId}`] = new window.YT.Player(`yt-player-${playerId}`, {
        height: '200',
        width: '355',
        videoId,
        events: {
          onReady: (event: any) => {
            event.target.loadVideoById({ videoId, startSeconds: start, endSeconds: end });
          }
        }
      });
    } else {
      window[`ytPlayer_${playerId}`].loadVideoById({ videoId, startSeconds: start, endSeconds: end });
    }
    setTimeout(() => {
      window[`ytPlayer_${playerId}`]?.stopVideo();
    }, (end - start) * 1000);
  };

  const handleClearChat = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    if (!window.confirm('Вы уверены, что хотите удалить весь чат?')) return;
    setClearChatError(null);
    setClearChatSuccess(false);
    try {
      const resp = await fetch(`${API_BASE_URL}/chat/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          handleTokenExpiration();
          return;
        }
        const data = await resp.json().catch(() => ({}));
        setClearChatError(data.detail || 'Ошибка удаления чата.');
        return;
      }
      setMessages([{
        id: '1',
        type: 'ai',
        content:
          aiLang === 'en'
            ? "Hello! I'm your music assistant. Send me a photo or video, and I'll analyze the mood and suggest suitable music! 🎵"
            : aiLang === 'kz'
            ? "Сәлем! Мен сенің музыкалық көмекшіңмін. Маған фото немесе видео жібер, мен көңіл-күйді талдап, лайықты музыка ұсынамын! 🎵"
            : "Привет! Я твой музыкальный помощник. Отправь мне фото или видео, и я проанализирую настроение и подберу подходящую музыку! 🎵",
        timestamp: new Date()
      }]);
      setClearChatSuccess(true);
    } catch (e) {
      setClearChatError('Ошибка удаления чата.');
    }
  };

  // Функция для повторной подборки
  const handleAnotherRecommendation = async (moodAnalysis: any) => {
    setIsLoading(true);
    try {
      // moodAnalysis должен быть не пустым объектом
      const payload = moodAnalysis && typeof moodAnalysis === 'object' ? moodAnalysis : { mood: 'neutral' };
      const recommendationsResponse = await fetch(`${API_BASE_URL}/chat/get-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const recommendationsData = await recommendationsResponse.json();
      const recommendationsMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: `🎵 Ещё одна подборка:`,
        timestamp: new Date(),
        recommendations: {
          personal: recommendationsData.personal,
          global: recommendationsData.global,
          ask_feedback: recommendationsData.ask_feedback
        },
        moodAnalysis: moodAnalysis
      };
      setMessages(prev => [...prev, recommendationsMessage]);
      saveMessageToBackend(recommendationsMessage);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Ошибка при получении новой подборки.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для генерации музыки
  const handleGenerateBeat = async (moodAnalysis: any) => {
    setGeneratingBeat(true);
    try {
      // Формируем prompt для генерации музыки
      let prompt = '';
      if (moodAnalysis && typeof moodAnalysis === 'object') {
        prompt = moodAnalysis.description || moodAnalysis.caption || moodAnalysis.mood || 'uplifting pop music';
      } else if (typeof moodAnalysis === 'string') {
        prompt = moodAnalysis;
      } else {
        prompt = 'uplifting pop music';
      }
      
      const resp = await fetch(`${API_BASE_URL}/chat/generate-beat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      const data = await resp.json();
      
      if (data.success) {
        if (data.status === 'pending') {
          // Асинхронная генерация - показываем сообщение и начинаем polling
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: `🎵 ${data.message || 'Генерация музыки началась...'}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          saveMessageToBackend(aiMessage);
          
          // Начинаем polling для проверки статуса
          if (data.request_id) {
            await pollGenerationStatus(data.request_id);
          }
        } else if (data.audio_url) {
          // Готовый результат
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: '🎵 Музыка готова!',
            timestamp: new Date(),
            generatedBeatUrl: `${API_BASE_URL}${data.audio_url}`
          };
          setMessages(prev => [...prev, aiMessage]);
          saveMessageToBackend(aiMessage);
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: 'Ошибка генерации музыки: ' + (data.error || 'Неизвестная ошибка'),
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        saveMessageToBackend(errorMessage);
      }
    } catch (e) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Ошибка генерации музыки.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      saveMessageToBackend(errorMessage);
    } finally {
      setGeneratingBeat(false);
    }
  };

  // Функция для polling статуса генерации
  const pollGenerationStatus = async (requestId: string) => {
    const maxAttempts = 24; // Максимум 2 минуты (24 * 5 секунд)
    let attempts = 0;
    
    const poll = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/chat/generate-beat/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ request_id: requestId })
        });
        const data = await resp.json();
        
        if (data.success && data.status) {
          const status = data.status.status || data.status;
          
          if (status === 'complete') {
            // Генерация завершена
            const audioUrl = data.status.local_audio_url || data.status.audio_url;
            if (audioUrl) {
              const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: '🎵 Музыка готова!',
                timestamp: new Date(),
                generatedBeatUrl: `${API_BASE_URL}${audioUrl}`
              };
              setMessages(prev => [...prev, aiMessage]);
              saveMessageToBackend(aiMessage);
              return;
            }
          } else if (status === 'failed') {
            const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              type: 'ai',
              content: 'Ошибка генерации музыки: процесс завершился с ошибкой',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
            saveMessageToBackend(errorMessage);
            return;
          } else if (status === 'pending') {
            // Показываем прогресс
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.content.includes('Генерация началась')) {
                const updatedMessage = {
                  ...lastMessage,
                  content: `🎵 Генерация в процессе... (${attempts + 1}/${maxAttempts})`
                };
                return [...prev.slice(0, -1), updatedMessage];
              }
              return prev;
            });
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          // Продолжаем polling через 5 секунд
          setTimeout(poll, 5000);
        } else {
          const timeoutMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: 'Время ожидания генерации истекло (2 минуты). Попробуйте еще раз.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, timeoutMessage]);
          saveMessageToBackend(timeoutMessage);
        }
      } catch (e) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: 'Ошибка проверки статуса генерации.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          saveMessageToBackend(errorMessage);
        }
      }
    };
    
    // Начинаем polling через 5 секунд
    setTimeout(poll, 5000);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>{t('ai_helper_title')}</div>
            <div style={{ color: '#fff', fontSize: 14, marginTop: 2 }}>
              🎬 {t('ai_helper_subtitle')}
            </div>
          </div>
          <button
            onClick={handleClearChat}
            style={{ background: '#ff4d6d', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer', marginLeft: 16 }}
            title="Очистить чат"
          >
            🗑 Очистить чат
          </button>
        </div>
        {clearChatError && <div style={{ color: 'red', marginTop: 8 }}>{clearChatError}</div>}
        {clearChatSuccess && <div style={{ color: 'green', marginTop: 8 }}>Чат успешно удалён!</div>}
      </div>

      <div className="chat-messages">
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span role="img" aria-label="lang">🌐</span>
          <span style={{ fontWeight: 500 }}>{t('ai_lang_label')}</span>
          <select
            value={aiLang}
            onChange={e => {
              setAiLang(e.target.value);
              localStorage.setItem('ai_lang', e.target.value);
            }}
            style={{ padding: '4px 8px', borderRadius: 4 }}
          >
            {AI_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              {message.mediaUrl && (
                <div className="media-preview" style={{ marginBottom: 8 }}>
                  {message.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={message.mediaUrl}
                      alt="Uploaded media"
                      style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, margin: 4 }}
                    />
                  ) : message.mediaUrl.match(/\.(mp4|mov|avi|mkv|webm)$/i) ? (
                    <video
                      controls
                      style={{ maxWidth: 220, borderRadius: 8, margin: 4 }}
                    >
                      <source src={message.mediaUrl} />
                      Ваш браузер не поддерживает видео.
                    </video>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 15 }}>
                      <span role="img" aria-label="file">📎</span>
                      <span>{message.mediaUrl.split('/').pop()}</span>
                    </div>
                  )}
                  {/* Показываем описание, если оно есть */}
                  {message.content && (
                    <div style={{ marginTop: 6, color: '#444', fontSize: 14 }}>{message.content}</div>
                  )}
                </div>
              )}
              <div 
                className="message-text"
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
              />
              {/* Если есть рекомендации, показываем две подборки */}
              {message.recommendations && (message.recommendations.personal || message.recommendations.global) && (
                (() => {
                  const personal = message.recommendations.personal?.recommended_tracks || [];
                  const global = message.recommendations.global?.recommended_tracks || [];
                  if (personal.length === 0 && global.length === 0) {
                    return <div style={{ marginTop: 16, color: '#888', fontSize: 15 }}>Нет рекомендаций</div>;
                  }
                  return (
                    <div style={{ marginTop: 16, width: '100%' }}>
                      {['personal', 'global'].map(type => (
                        message.recommendations[type] && message.recommendations[type].recommended_tracks && message.recommendations[type].recommended_tracks.length > 0 && (
                          <div key={type} style={{ marginBottom: 28 }}>
                            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: type === 'personal' ? '#1DB954' : '#667eea' }}>
                              {type === 'personal' ? 'Персональные рекомендации' : 'Глобальные рекомендации'}
                            </div>
                            <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                              <table style={{ width: 'max-content', background: '#fff', borderRadius: 8, overflow: 'hidden', fontSize: 14 }}>
                                <thead>
                                  <tr style={{ background: '#f5f5f5' }}>
                                    <th style={{ padding: 8 }}>Название</th>
                                    <th style={{ padding: 8 }}>Артист</th>
                                    <th style={{ padding: 8 }}>Причина</th>
                                    <th style={{ padding: 8 }}>YouTube</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {message.recommendations[type].recommended_tracks.map((track: any, idx: number) => {
                                    const key = `${type}__${track.name}__${track.artist}`;
                                    const cached = youtubeCache[key];
                                    return (
                                      <tr key={key}>
                                        <td style={{ padding: 8 }}>{track.name}</td>
                                        <td style={{ padding: 8 }}>{track.artist}</td>
                                        <td style={{ padding: 8 }}>{track.reason}</td>
                                        <td style={{ padding: 8, minWidth: 240, maxWidth: 260 }}>
                                          {track.youtube_id && typeof track.start_time === 'number' && typeof track.end_time === 'number' ? (
                                            <div>
                                              <button
                                                style={{ fontSize: 18, background: '#1DB954', color: 'white', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', marginBottom: 4 }}
                                                onClick={() => playSegment(`${key}`, track.youtube_id, track.start_time, track.end_time)}
                                                title="Воспроизвести сегмент YouTube"
                                              >
                                                ▶️
                                              </button>
                                              {typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) ? null : (
                                                <div id={`yt-player-${key}`}></div>
                                              )}
                                              <AudioWithCache
                                                src={`${API_BASE_URL}/recommend/youtube-audio?video_id=${track.youtube_id}`}
                                                style={{ marginTop: 8, width: 220 }}
                                              />
                                            </div>
                                          ) : cached === undefined ? (
                                            <span style={{ color: '#888', fontSize: 13 }}>
                                              {quotaExceeded ? 'Сейчас квота YouTube API исчерпана' : 'Поиск видео...'}
                                            </span>
                                          ) : cached.videoId ? (
                                            <>
                                              <iframe
                                                ref={el => { embedRefs.current[key] = el; }}
                                                width="220"
                                                height="124"
                                                src={getYoutubeEmbedUrl(cached.videoId, track.start_time_ms)}
                                                title={track.name}
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                style={{ borderRadius: 8, marginTop: 4, display: 'block' }}
                                              />
                                              <AudioWithCache
                                                src={`${API_BASE_URL}/recommend/youtube-audio?video_id=${cached.videoId}`}
                                                style={{ marginTop: 8, width: 220 }}
                                              />
                                            </>
                                          ) : (
                                            <span style={{ color: '#888', fontSize: 13 }}>
                                              {quotaExceeded ? 'Сейчас квота YouTube API исчерпана' : 'Видео не найдено'}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  );
                })()
              )}
              {message.recommendations && message.recommendations.ask_feedback && (
                <div style={{ marginTop: 18, display: 'flex', gap: 16 }}>
                  <button
                    onClick={() => handleAnotherRecommendation(message.moodAnalysis || currentMoodAnalysis)}
                    style={{ background: '#1DB954', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                    disabled={isLoading}
                  >
                    Ещё подборка
                  </button>
                  <button
                    onClick={() => handleGenerateBeat(message.moodAnalysis || currentMoodAnalysis)}
                    style={{ background: '#667eea', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                    disabled={generatingBeat}
                  >
                    {generatingBeat ? 'Генерация...' : 'Сгенерировать музыку'}
                  </button>
                </div>
              )}
              {message.generatedBeatUrl && (
                <div style={{ marginTop: 18 }}>
                  <b>🎶 Сгенерированный бит:</b>
                  <AudioWithCache src={message.generatedBeatUrl} style={{ width: 220, marginTop: 8 }} />
                </div>
              )}
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai">
            <div className="message-content">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        {quotaExceeded && (
          <div style={{ margin: '24px 0', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: 18 }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#d48806' }}>
              Квота YouTube API исчерпана 😔
            </div>
            <div style={{ marginBottom: 8 }}>
              Хотите послушать конкретные треки? Введите ссылки на YouTube (можно несколько через запятую или с новой строки):
            </div>
            <textarea
              value={manualLinks}
              onChange={e => setManualLinks(e.target.value)}
              placeholder="https://youtu.be/abc123, https://www.youtube.com/watch?v=xyz456"
              style={{ width: '100%', minHeight: 60, borderRadius: 6, border: '1px solid #ccc', padding: 8, marginBottom: 8 }}
            />
            <button
              onClick={() => {
                const links = manualLinks.split(/\s|,|;/).map(s => s.trim()).filter(Boolean);
                const ids = links.map(link => {
                  const m = link.match(/(?:v=|be\/)([\w-]{11})/);
                  return m ? m[1] : '';
                }).filter(Boolean);
                setManualTracks(ids);
              }}
              style={{ background: '#1DB954', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
            >
              ▶️ Воспроизвести
            </button>
            {manualTracks.length > 0 && (
              <div style={{ marginTop: 18 }}>
                {manualTracks.map(id => (
                  <div key={id} style={{ marginBottom: 16 }}>
                    <AudioWithCache src={`${API_BASE_URL}/recommend/youtube-audio?video_id=${id}`} style={{ width: 220 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Блок для ручного ввода YouTube-ссылок для конвертации в аудио (всегда видим) */}
      <div style={{ margin: '24px 0', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: 18 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#d48806' }}>
          Конвертация YouTube в аудио
        </div>
        <div style={{ marginBottom: 8 }}>
          Вставьте ссылку на YouTube из списка рекомендаций или любую другую (можно несколько через запятую или с новой строки):
        </div>
        <textarea
          value={manualLinks}
          onChange={e => setManualLinks(e.target.value)}
          placeholder="https://youtu.be/abc123, https://www.youtube.com/watch?v=xyz456"
          style={{ width: '100%', minHeight: 60, borderRadius: 6, border: '1px solid #ccc', padding: 8, marginBottom: 8 }}
        />
        <button
          onClick={() => {
            const links = manualLinks.split(/\s|,|;/).map(s => s.trim()).filter(Boolean);
            const ids = links.map(link => {
              const m = link.match(/(?:v=|be\/)([\w-]{11})/);
              return m ? m[1] : '';
            }).filter(Boolean);
            setManualTracks(ids);
          }}
          style={{ background: '#1DB954', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
        >
          ▶️ Сконвертировать в аудио
        </button>
        {manualTracks.length > 0 && (
          <div style={{ marginTop: 18 }}>
            {manualTracks.map(id => (
              <div key={id} style={{ marginBottom: 16 }}>
                <AudioWithCache src={`${API_BASE_URL}/recommend/youtube-audio?video_id=${id}`} style={{ width: 220 }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <div className="file-upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
          >
            {uploadingFile ? '📤 Загрузка...' : '📎 Прикрепить файл'}
          </button>
        </div>

        {/* Окно для ввода описания к медиафайлу */}
        {showDescriptionInput && (
          <div style={{ marginBottom: 12, background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
            <input
              type="text"
              value={mediaDescription}
              onChange={e => setMediaDescription(e.target.value)}
              placeholder="Опишите настроение или стиль музыки..."
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', marginBottom: 8 }}
              disabled={uploadingFile}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSendFileWithDescription}
                disabled={uploadingFile}
                style={{ background: '#1DB954', color: 'white', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}
              >
                Отправить
              </button>
              <button
                onClick={() => { setShowDescriptionInput(false); setPendingFile(null); setMediaDescription(''); }}
                disabled={uploadingFile}
                style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        <div className="input-section">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Напиши сообщение или отправь медиафайл..."
            disabled={isLoading}
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="send-btn"
          >
            ➤
          </button>
        </div>
      </div>

      {/* Модальное окно лимита */}
      {showLimitModal && (
        <div className="modal-overlay" onClick={() => setShowLimitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ {t('limit_exceeded_title') || 'Лимит исчерпан'}</h2>
              <button className="modal-close" onClick={() => setShowLimitModal(false)}>
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
                onClick={() => {
                  alert('Функция перехода на PRO будет реализована позже');
                  setShowLimitModal(false);
                }}
              >
                ⭐ {t('upgrade_to_pro') || 'UPGRADE TO PRO'}
              </button>
              <button 
                className="btn-cancel-modal"
                onClick={() => setShowLimitModal(false)}
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

export default Chat; 