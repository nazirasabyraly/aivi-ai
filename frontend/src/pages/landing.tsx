import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './landing.css';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="landing-container">
      <LanguageSwitcher />
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="gradient-text">{t('landing_hero_title')}</span>
            </h1>
            <p className="hero-description">
              {t('landing_hero_description')}
            </p>
            <div className="hero-buttons">
              <button 
                className="cta-button primary"
                onClick={() => navigate('/login')}
              >
                {t('landing_try_free')}
              </button>
              <button 
                className="cta-button secondary"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t('landing_learn_more')}
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
          <h2 className="section-title">{t('landing_how_it_works')}</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h3>{t('landing_upload_media')}</h3>
              <p>{t('landing_upload_description')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>{t('landing_ai_analysis')}</h3>
              <p>{t('landing_ai_description')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎶</div>
              <h3>{t('landing_personal_playlist')}</h3>
              <p>{t('landing_playlist_description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section className="examples">
        <div className="container">
          <h2 className="section-title">{t('landing_examples')}</h2>
          <div className="examples-grid">
            <div className="example-card">
              <div className="example-image sunset"></div>
              <div className="example-content">
                <h4>{t('landing_sunset_beach')}</h4>
                <p>{t('landing_sunset_music')}</p>
              </div>
            </div>
            <div className="example-card">
              <div className="example-image party"></div>
              <div className="example-content">
                <h4>{t('landing_party_friends')}</h4>
                <p>{t('landing_party_music')}</p>
              </div>
            </div>
            <div className="example-card">
              <div className="example-image nature"></div>
              <div className="example-content">
                <h4>{t('landing_forest_walk')}</h4>
                <p>{t('landing_forest_music')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>{t('landing_ready_discover')}</h2>
          <p>{t('landing_join_users')}</p>
          <button 
            className="cta-button primary large"
            onClick={() => navigate('/login')}
          >
            {t('landing_start_now')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>🎵 {t('landing_footer_brand')}</h3>
              <p>{t('landing_footer_tagline')}</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>{t('landing_footer_product')}</h4>
                <a href="#features">{t('landing_footer_features')}</a>
                <a href="#examples">{t('landing_footer_examples')}</a>
              </div>
              <div className="footer-column">
                <h4>{t('landing_footer_support')}</h4>
                <a href="#">{t('landing_footer_help')}</a>
                <a href="#">{t('landing_footer_contacts')}</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing; 