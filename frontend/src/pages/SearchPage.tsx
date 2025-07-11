import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { API_BASE_URL } from '../config';
import BeautifulAudioPlayer from '../components/BeautifulAudioPlayer';
import { useTranslation } from 'react-i18next';
import './search.css'; // Создадим этот файл для стилей

interface SearchResult {
    video_id: string;
    title: string;
    channel_title: string;
}

const SearchPage: React.FC = () => {
    const { t } = useTranslation();
    const { getToken } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setSearched(true);

        try {
            const token = await getToken();
            if (!token) {
                throw new Error("Требуется авторизация");
            }

            const response = await fetch(`${API_BASE_URL}/recommend/youtube-search?q=${encodeURIComponent(query)}&max_results=12`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Ошибка при выполнении поиска');
            }

            const data = await response.json();
            setResults(data.results || []);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Произошла неизвестная ошибка');
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="search-page-container">
            <div className="search-header-section">
                <h1>{t('search_title')}</h1>
                <p>{t('search_subtitle')}</p>
                <form onSubmit={handleSearch} className="search-form">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('search_placeholder')}
                        className="search-input"
                        disabled={isLoading}
                    />
                    <button type="submit" className="search-button" disabled={isLoading}>
                        {isLoading ? t('search_loading') : t('search_button')}
                    </button>
                </form>
            </div>

            {error && <div className="search-error-message">{error}</div>}

            <div className="search-results-section">
                {isLoading ? (
                    <div className="search-loader"></div>
                ) : searched && results.length === 0 && !error ? (
                    <div className="search-no-results">
                        <h3>{t('search_no_results_title')}</h3>
                        <p>{t('search_no_results_subtitle')}</p>
                    </div>
                ) : (
                    <div className="search-results-grid">
                        {results.map((item) => (
                            <div key={item.video_id} className="search-result-card">
                                <BeautifulAudioPlayer
                                    videoId={item.video_id}
                                    title={item.title}
                                    artist={item.channel_title}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage; 