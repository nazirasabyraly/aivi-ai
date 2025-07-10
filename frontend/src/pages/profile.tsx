import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
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
  const { user, isLoaded } = useUser(); // Clerk user
  const { signOut } = useClerk(); // Clerk logout
  const { getToken } = useAuth(); // Clerk token
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      // Ждем загрузки Clerk
      if (!isLoaded) {
        setLoading(true);
        return;
      }

      // Проверяем авторизацию: Clerk пользователь или старый токен
      const token = localStorage.getItem('auth_token');
      if (!user && !token) {
        navigate('/login');
        return;
      }

      // Если это Clerk пользователь, получаем данные с backend
      if (user) {
        try {
          // Получаем токен Clerk для авторизации на backend
          const token = await getToken();
          
          const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const data = await response.json();
            setProfile(data);
          } else {
            // Fallback к данным Clerk если backend недоступен
            const clerkProfile: UserProfile = {
              id: 0,
              username: user.username || user.emailAddresses[0]?.emailAddress.split('@')[0] || 'User',
              email: user.emailAddresses[0]?.emailAddress || '',
              name: user.fullName || user.firstName || '',
              avatar_url: user.imageUrl || '',
              account_type: 'basic',
              daily_usage: 0,
              remaining_analyses: 3,
              is_verified: user.emailAddresses[0]?.verification?.status === 'verified' || false,
              provider: 'clerk',
              created_at: user.createdAt?.toISOString() || new Date().toISOString()
            };
            setProfile(clerkProfile);
          }
        } catch (error) {
          console.error('Error fetching Clerk user profile:', error);
          setError('Ошибка загрузки профиля');
        } finally {
          setLoading(false);
        }
        return;
      }

      // Загружаем профиль для старых пользователей
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
  }, [user, isLoaded, navigate, getToken, t]);

  const handleLogout = async () => {
    // Выходим из Clerk если пользователь авторизован через Clerk
    if (user) {
      await signOut();
    }
    
    // Очищаем старые токены
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
              {profile.provider === 'clerk' ? (
                <div className="name-display">
                  <span>{profile.username}</span>
                </div>
              ) : editingName ? (
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