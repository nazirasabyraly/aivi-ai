import React from 'react';
import { useNavigate } from 'react-router-dom';
import './landing.css';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Ваш <span className="gradient-text">AI музыкальный</span> помощник
            </h1>
            <p className="hero-description">
              Загрузите фото или видео, и наш ИИ создаст персональную музыкальную подборку, 
              соответствующую вашему настроению и атмосфере момента
            </p>
            <div className="hero-buttons">
              <button 
                className="cta-button primary"
                onClick={() => navigate('/login')}
              >
                Попробовать бесплатно
              </button>
              <button 
                className="cta-button secondary"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Узнать больше
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-card">
              <div className="music-visualization">
                <div className="wave wave-1"></div>
                <div className="wave wave-2"></div>
                <div className="wave wave-3"></div>
                <div className="wave wave-4"></div>
              </div>
              <div className="ai-icon">🎵</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Как это работает?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h3>Загрузите медиа</h3>
              <p>Отправьте фото или видео, которое отражает ваше настроение</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI анализ</h3>
              <p>Наш ИИ анализирует визуальные элементы и определяет настроение</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎶</div>
              <h3>Персональная подборка</h3>
              <p>Получите кураторскую подборку треков, идеально подходящую моменту</p>
            </div>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section className="examples">
        <div className="container">
          <h2 className="section-title">Примеры работы</h2>
          <div className="examples-grid">
            <div className="example-card">
              <div className="example-image sunset"></div>
              <div className="example-content">
                <h4>Закат на пляже</h4>
                <p>Чил-хоп, эмбиент, лаундж</p>
              </div>
            </div>
            <div className="example-card">
              <div className="example-image party"></div>
              <div className="example-content">
                <h4>Вечеринка с друзьями</h4>
                <p>Поп, дэнс, хип-хоп</p>
              </div>
            </div>
            <div className="example-card">
              <div className="example-image nature"></div>
              <div className="example-content">
                <h4>Прогулка в лесу</h4>
                <p>Инди, фолк, акустика</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Готовы открыть новую музыку?</h2>
          <p>Присоединяйтесь к тысячам пользователей, которые уже открыли идеальные треки</p>
          <button 
            className="cta-button primary large"
            onClick={() => navigate('/login')}
          >
            Начать прямо сейчас
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>🎵 AI Music</h3>
              <p>Музыка по настроению</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Продукт</h4>
                <a href="#features">Возможности</a>
                <a href="#examples">Примеры</a>
              </div>
              <div className="footer-column">
                <h4>Поддержка</h4>
                <a href="#">Помощь</a>
                <a href="#">Контакты</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing; 