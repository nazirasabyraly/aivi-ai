import React from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'kz', label: 'Қазақша', flag: '🇰🇿' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 2000,
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      padding: '4px 10px',
      display: 'flex',
      gap: 8,
      alignItems: 'center',
    }}>
      {languages.map(l => (
        <button
          key={l.code}
          onClick={() => handleChange(l.code)}
          style={{
            background: i18n.language === l.code ? '#e1e5e9' : 'transparent',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            padding: 4,
            borderRadius: '50%',
            outline: i18n.language === l.code ? '2px solid #667eea' : 'none',
            transition: 'outline 0.2s',
          }}
          aria-label={l.label}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher; 