import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import './profile.css';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  name?: string;
  avatar_url?: string;
  account_type: 'basic' | 'pro';
  daily_usage: number;
  remaining_analyses: number;
  is_verified: boolean;
  provider: string;
  created_at: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('auth_token');
            navigate('/login');
            return;
          }
          throw new Error('Ошибка загрузки профиля');
        }

        const data = await response.json();
        setProfile(data);
      } catch (error) {
        setError('Ошибка загрузки профиля');
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    navigate('/login');
  };

  const handleEditName = () => {
    setNewName(profile?.username || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      setError('Имя пользователя не может быть пустым');
      return;
    }

    setUpdating(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/users/update-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: newName.trim() })
      });

      if (!response.ok) {
        throw new Error('Ошибка обновления профиля');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setEditingName(false);
      setError('');
    } catch (error) {
      setError('Ошибка обновления имени пользователя');
      console.error('Error updating profile:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNewName('');
    setError('');
  };

  const handleUpgrade = () => {
    // TODO: Реализовать логику перехода на PRO
    alert('Функция перехода на PRO будет реализована позже');
  };

  const getAccountTypeDisplay = (accountType: string) => {
    return accountType === 'pro' ? 'PRO' : t('basic_account') || 'Обычный';
  };

  const getRemainingAnalysesDisplay = (remaining: number, daily_usage: number) => {
    if (remaining === -1) {
      return t('unlimited') || 'Безлимитно';
    }
    return `${daily_usage}/3`;
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>{t('loading') || 'Загрузка...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            {t('retry') || 'Попробовать снова'}
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <p>{t('profile_not_found') || 'Профиль не найден'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>{t('profile') || 'Профиль'}</h1>
        {/* Временно показываем кнопку всегда для тестирования */}
        <button 
          className="header-upgrade-btn"
          onClick={handleUpgrade}
        >
          ⭐ {t('upgrade_to_pro') || 'UPGRADE TO PRO'}
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-info">
            <div className="info-group">
              <label>{t('name') || 'Имя'}:</label>
              <span>{profile.name || profile.username}</span>
            </div>

            <div className="info-group">
              <label>{t('email') || 'Email'}:</label>
              <span>{profile.email}</span>
            </div>

            <div className="info-group">
              <label>{t('username') || 'Имя пользователя'}:</label>
              {editingName ? (
                <div className="edit-name-container">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="edit-name-input"
                    placeholder={t('enter_username') || 'Введите имя пользователя'}
                    disabled={updating}
                  />
                  <div className="edit-name-buttons">
                    <button 
                      onClick={handleSaveName}
                      disabled={updating}
                      className="save-btn"
                    >
                      {updating ? '...' : '✓'}
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      disabled={updating}
                      className="cancel-btn"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="name-display">
                  <span>{profile.username}</span>
                  <button 
                    onClick={handleEditName}
                    className="edit-name-btn"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>

            <div className="info-group">
              <label>{t('account_type') || 'Тип аккаунта'}:</label>
              <span className={`account-type ${profile.account_type}`}>
                {getAccountTypeDisplay(profile.account_type)}
              </span>
            </div>

            <div className="info-group">
              <label>{t('daily_analyses') || 'Анализы сегодня'}:</label>
              <span className="usage-info">
                {getRemainingAnalysesDisplay(profile.remaining_analyses, profile.daily_usage)}
              </span>
            </div>

            <div className="info-group">
              <label>{t('registration_method') || 'Способ регистрации'}:</label>
              <span className="provider">
                {profile.provider === 'google' 
                  ? t('google_oauth') || 'Google OAuth' 
                  : t('email_registration') || 'Email регистрация'
                }
              </span>
            </div>

            <div className="info-group">
              <label>{t('registration_date') || 'Дата регистрации'}:</label>
              <span>{new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {profile.account_type === 'basic' && (
            <div className="upgrade-section">
              <h3>{t('upgrade_to_pro') || 'Перейти на PRO'}</h3>
              <p>{t('pro_benefits') || 'Безлимитные анализы, приоритетная поддержка и дополнительные функции'}</p>
              <button className="upgrade-button" onClick={handleUpgrade}>
                {t('upgrade_now') || 'Перейти на PRO'}
              </button>
            </div>
          )}

          <div className="profile-actions">
            <button 
              className="refresh-button"
              onClick={() => window.location.reload()}
            >
              🔄 {t('refresh') || 'Обновить'}
            </button>
            <button 
              className="logout-button"
              onClick={handleLogout}
            >
              {t('logout') || 'Выйти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 