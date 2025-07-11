import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import BeautifulAudioPlayer from './BeautifulAudioPlayer'; 

interface Track {
  video_id: string;
  title: string;
  artist: string;
  description?: string;
}

interface RecommendationsProps {
  globalRecs: Track[];
  personalRecs: Track[];
  isLoading: boolean;
}

const Recommendations: React.FC<RecommendationsProps> = ({ globalRecs, personalRecs, isLoading }) => {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [savedSongs, setSavedSongs] = useState<Set<string>>(new Set());

  // Функция для получения сохраненных песен
  const fetchSavedSongs = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/media/saved-songs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch saved songs');
      }

      const songs: Track[] = await response.json();
      setSavedSongs(new Set(songs.map(s => s.video_id)));
    } catch (error) {
      console.error("Error fetching saved songs:", error);
      toast.error(t('Could not load your favorite songs.'));
    }
  };

  // Загружаем сохраненные песни при монтировании компонента
  useEffect(() => {
    fetchSavedSongs();
  }, []);


  const handleLike = async (track: Track) => {
    try {
      const token = await getToken();
      if (!token) {
        toast.error(t('You must be logged in to save songs.'));
        return;
      }

      // Оптимистичное обновление UI
      const newSavedSongs = new Set(savedSongs);
      newSavedSongs.add(track.video_id);
      setSavedSongs(newSavedSongs);

      const response = await fetch(`${API_BASE_URL}/media/saved-songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          youtube_video_id: track.video_id,
          title: track.title,
          artist: track.artist,
        }),
      });
      
      const responseData = await response.json();

      if (!response.ok) {
        // Откатываем UI в случае ошибки
        const revertedSongs = new Set(savedSongs);
        revertedSongs.delete(track.video_id);
        setSavedSongs(revertedSongs);
        
        console.error("Failed to save song:", response.status, responseData);
        toast.error(`${t('Error saving song')}: ${responseData.detail || response.statusText}`);
      } else {
        toast.success(`"${track.title}" ${t('added to favorites!')}`);
        // Можно дополнительно обновить состояние, если нужно
      }
    } catch (error) {
        // Откатываем UI в случае ошибки
        const revertedSongs = new Set(savedSongs);
        revertedSongs.delete(track.video_id);
        setSavedSongs(revertedSongs);
      
        console.error("Network or other error saving song:", error);
        toast.error(t('A network error occurred. Please try again.'));
    }
  };

  const renderTrack = (track: Track, type: 'global' | 'personal') => {
    const isSaved = savedSongs.has(track.video_id);

    return (
      <div key={`${type}-${track.video_id}`} className="recommendation-card">
        <div className="card-content">
          <h4>{track.title}</h4>
          <p className="artist">{track.artist}</p>
          <p className="description">{track.description || t('mood_based_recommendation')}</p>
          <BeautifulAudioPlayer
            videoId={track.video_id}
            title={track.title}
            artist={track.artist}
          />
          <button
            onClick={() => handleLike(track)}
            className={`like-button ${isSaved ? 'saved' : ''}`}
            disabled={isSaved}
          >
            {isSaved ? t('Saved to favorites') : t('Like')}
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="recommendations-container">
      <h3>{t('personal_recommendations')}</h3>
      {isLoading ? (
        <p>{t('loading_recommendations')}</p>
      ) : personalRecs.length > 0 ? (
        <div className="recommendations-grid">{personalRecs.map(track => renderTrack(track, 'personal'))}</div>
      ) : (
        <p>{t('no_personal_recommendations')}</p>
      )}

      <h3>{t('global_recommendations')}</h3>
      {isLoading ? (
        <p>{t('loading_recommendations')}</p>
      ) : globalRecs.length > 0 ? (
        <div className="recommendations-grid">{globalRecs.map(track => renderTrack(track, 'global'))}</div>
      ) : (
        <p>{t('no_global_recommendations')}</p>
      )}
    </div>
  );
};

export default Recommendations; 