import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      'login': 'Войти',
      'logout': 'Выйти',
      'loading': 'Загрузка...',
      'processing': 'Обработка...',
      'back': 'Назад',
      'or': 'или',
      'register': 'Зарегистрироваться',
      'register_login': 'Регистрация / Вход',
      'already_have_account': 'Уже есть аккаунт? Войти',
      'no_account': 'Нет аккаунта? Зарегистрироваться',
      'username': 'Имя пользователя',
      'enter_username': 'Введите имя пользователя',
      'password': 'Пароль',
      'enter_password': 'Введите пароль',
      'welcome': 'Анализ музыкального вкуса и ИИ-помощник',
      'what_can_do': 'Что умеет Aivi?',
      'analyze_music': 'Анализ вашего музыкального вкуса',
      'ai_chat': 'ИИ-чат для анализа фото/видео',
      'music_recommend': 'Подбор музыки под ваш контент',
      'modern_ui': 'Современный интерфейс',
      'secure_login': 'Безопасная регистрация и вход',
      'analyzing_music': 'Анализируем ваш музыкальный вкус ⏳',
      'light_theme': 'Светлая тема',
      'dark_theme': 'Тёмная тема',
      'profile': 'Профиль',
      'name': 'Имя',
      'country': 'Страна',
      'music_analysis': 'Анализ музыкального вкуса',
      'overall_mood': 'Общее настроение',
      'positivity': 'Позитивность',
      'energy': 'Энергия',
      'danceability': 'Танцевальность',
      'tempo': 'Темп',
      'favorite_artists': 'Любимые исполнители',
      'total_tracks_analyzed': 'Треков проанализировано',
      'top_tracks': 'Топ треки',
      'ai_helper_title': 'Музыкальный ИИ-помощник',
      'ai_helper_subtitle': 'Отправь фото или видео для анализа настроения',
      'ai_lang_label': 'Язык общения с ИИ:',
      'recommendations_search_placeholder': 'Поиск по названию, артисту, вайбу...',
      'recommendations_search_button': 'Найти',
      'recommendations_searching': 'Поиск...',
      'recommendations_like': '❤️ В избранное',
      'recommendations_liked': 'В избранном',
      'recommendations_error': 'Ошибка поиска или добавления',
      'recommendations_login_required': 'Требуется вход в систему',
      'recommendations_success_like': 'Добавлено в избранное!',
      'favorites_loading': 'Загрузка избранного...',
      'favorites_error': 'Ошибка загрузки избранного',
      'favorites_empty': 'У вас нет избранных песен.',
      'favorites_delete': 'Удалить из избранного',
      'favorites_deleted': 'Песня удалена из избранного',
      'favorites_date_added': 'Добавлено',
      
      // Favorites detailed
      'favorites_title': 'Ваше избранное',
      'favorites_login_required': 'Войдите в систему, чтобы посмотреть избранное',
      'favorites_load_failed': 'Не удалось загрузить избранное',
      'favorites_load_error': 'Ошибка загрузки избранного',
      'favorites_no_songs': 'Пока нет избранных',
      'favorites_start_liking': 'Начните лайкать песни, чтобы увидеть их здесь!',
      'favorites_count_single': 'сохранённая песня',
      'favorites_count_multiple': 'сохранённых песен',
      'favorites_removing': 'Удаляем...',
      'favorites_delete_failed': 'Не удалось удалить из избранного',
      'favorites_delete_error': 'Ошибка удаления из избранного',
      
      // Interactive Studio
      'studio_main_title': 'Интерактивная музыкальная студия',
      'studio_main_subtitle': 'Анализируйте ваши медиа, открывайте музыку и создавайте персональные треки',
      'studio_upload_title': 'Загрузите ваш медиафайл',
      'studio_upload_description': 'Загрузите фото или видео для анализа настроения и получения персональных музыкальных рекомендаций',
      'studio_upload_click': 'Нажмите для загрузки',
      'studio_upload_drag': 'или перетащите файл сюда',
      'studio_upload_hint': 'Поддерживаются изображения и видео',
      'studio_analyze': 'Анализировать медиа',
      'studio_analyzing': 'Анализируем...',
      'studio_reset': 'Сбросить',
      'studio_mood_title': 'Анализ настроения',
      'studio_mood_description': 'Вот что мы узнали о настроении и энергии вашего медиа',
      'studio_primary_mood': 'Основное настроение и описание',
      'studio_emotions': 'Эмоции',
      'studio_musical_attributes': 'Музыкальные атрибуты',
      'studio_energy': 'Энергия',
      'studio_valence': 'Позитивность',
      'studio_danceability': 'Танцевальность',
      'studio_get_recommendations': 'Получить музыкальные рекомендации',
      'studio_getting_recommendations': 'Получаем рекомендации...',
      'studio_generate_beat': 'Создать персональную музыку',
      'studio_generating_beat': 'Создаём персональную музыку...',
      'studio_recommendations_title': 'Музыкальные рекомендации',
      'studio_recommendations_description': 'Подобранная музыка на основе анализа настроения вашего медиа',
      'studio_personal_tab': 'Персональные (На основе ваших предпочтений)',
      'studio_global_tab': 'Глобальные (Популярные совпадения)',
      'studio_match_score': 'совпадение',
      'studio_like': 'Лайк',
      'studio_liked': 'Понравилось',
      'studio_beat_title': 'Ваша персональная музыка',
      'studio_beat_description': 'ИИ-сгенерированная музыка на основе настроения вашего медиа',
      'studio_beat_generating': 'Создаём вашу персональную музыку...',
      'studio_beat_wait': 'Это может занять несколько минут. Мы создаем что-то особенное!',
      'studio_beat_ready': 'Ваша персональная музыка готова! 🎉',
      'studio_analysis_success': 'Анализ медиа завершен! Прокрутите вниз, чтобы увидеть результаты.',
      'studio_recommendations_success': 'Рекомендации сгенерированы!',
      'studio_beat_failed': 'Не удалось создать персональную музыку',
      'studio_beat_timeout': 'Превышено время ожидания создания музыки',
      'studio_beat_status_error': 'Ошибка проверки статуса генерации',
      
      // Dashboard tabs
      'dashboard_studio': 'Студия',
      'dashboard_search': 'Поиск',
      'dashboard_favorites': 'Избранное',
      
      // Search Page
      'search_title': 'Поиск музыки',
      'search_subtitle': 'Найдите любую песню или исполнителя на YouTube',
      'search_placeholder': 'Введите название песни или исполнителя...',
      'search_button': 'Найти',
      'search_loading': 'Поиск...',
      'search_no_results_title': 'Ничего не найдено',
      'search_no_results_subtitle': 'Попробуйте изменить ваш поисковый запрос.',

      // Profile
      'basic_account': 'Обычный',
      'unlimited': 'Безлимитно',
      'retry': 'Попробовать снова',
      'profile_not_found': 'Профиль не найден',
      'back_to_dashboard': 'Назад к дашборду',
      'account_type': 'Тип аккаунта',
      'daily_analyses': 'Анализы сегодня',
      'registration_method': 'Способ регистрации',
      'google_oauth': 'Google OAuth',
      'email_registration': 'Email регистрация',
      'registration_date': 'Дата регистрации',
      'upgrade_to_pro': 'Перейти на PRO',
      'pro_benefits': 'Безлимитные анализы, приоритетная поддержка и дополнительные функции',
      'upgrade_now': 'Перейти на PRO',
      'enter_name': 'Введите имя',
      
      // Limit modal
      'limit_exceeded_title': 'Лимит исчерпан',
      'limit_exceeded_message': 'У вас исчерпан лимит анализов на сегодня (3/3). Вы можете:',
      'wait_tomorrow': 'Подождать до завтра (лимит обновится в 00:00)',
      'upgrade_for_unlimited': 'Перейти на PRO для безлимитных анализов',
      'current_usage': 'Текущее использование',
      
      // Landing page
      'landing_hero_title': 'Ваш AI музыкальный помощник',
      'landing_hero_description': 'Загрузите фото или видео, и наш ИИ создаст персональную музыкальную подборку, соответствующую вашему настроению и атмосфере момента',
      'landing_try_free': 'Попробовать бесплатно',
      'landing_learn_more': 'Узнать больше',
      'landing_how_it_works': 'Как это работает?',
      'landing_upload_media': 'Загрузите медиа',
      'landing_upload_description': 'Отправьте фото или видео, которое отражает ваше настроение',
      'landing_ai_analysis': 'AI анализ',
      'landing_ai_description': 'Наш ИИ анализирует визуальные элементы и определяет настроение',
      'landing_personal_playlist': 'Персональная подборка',
      'landing_playlist_description': 'Получите кураторскую подборку треков, идеально подходящую моменту',
      'landing_examples': 'Примеры работы',
      'landing_sunset_beach': 'Закат на пляже',
      'landing_sunset_music': 'Чил-хоп, эмбиент, лаундж',
      'landing_party_friends': 'Вечеринка с друзьями',
      'landing_party_music': 'Поп, дэнс, хип-хоп',
      'landing_forest_walk': 'Прогулка в лесу',
      'landing_forest_music': 'Инди, фолк, акустика',
      'landing_ready_discover': 'Готовы открыть новую музыку?',
      'landing_join_users': 'Присоединяйтесь к тысячам пользователей, которые уже открыли идеальные треки',
      'landing_start_now': 'Начать прямо сейчас',
      'landing_footer_brand': 'AI Music',
      'landing_footer_tagline': 'Музыка по настроению',
      'landing_footer_product': 'Продукт',
      'landing_footer_features': 'Возможности',
      'landing_footer_examples': 'Примеры',
      'landing_footer_support': 'Поддержка',
      'landing_footer_help': 'Помощь',
      'landing_footer_contacts': 'Контакты',
    }
  },
  en: {
    translation: {
      'login': 'Login',
      'logout': 'Logout',
      'loading': 'Loading...',
      'processing': 'Processing...',
      'back': 'Back',
      'or': 'or',
      'register': 'Register',
      'register_login': 'Register / Login',
      'already_have_account': 'Already have an account? Login',
      'no_account': 'No account? Register',
      'username': 'Username',
      'enter_username': 'Enter username',
      'password': 'Password',
      'enter_password': 'Enter password',
      'welcome': 'Music taste analysis and AI assistant',
      'what_can_do': 'What can Aivi do?',
      'analyze_music': 'Analyze your music taste',
      'ai_chat': 'AI chat for photo/video analysis',
      'music_recommend': 'Music recommendations for your content',
      'modern_ui': 'Modern interface',
      'secure_login': 'Secure registration and login',
      'analyzing_music': 'Analyzing your music taste ⏳',
      'light_theme': 'Light theme',
      'dark_theme': 'Dark theme',
      'profile': 'Profile',
      'name': 'Name',
      'country': 'Country',
      'music_analysis': 'Music taste analysis',
      'overall_mood': 'Overall mood',
      'positivity': 'Positivity',
      'energy': 'Energy',
      'danceability': 'Danceability',
      'tempo': 'Tempo',
      'favorite_artists': 'Favorite artists',
      'total_tracks_analyzed': 'Tracks analyzed',
      'top_tracks': 'Top tracks',
      'ai_helper_title': 'Music AI Assistant',
      'ai_helper_subtitle': 'Send a photo or video for mood analysis',
      'ai_lang_label': 'AI chat language:',
      'recommendations_search_placeholder': 'Search by title, artist, vibe...',
      'recommendations_search_button': 'Search',
      'recommendations_searching': 'Searching...',
      'recommendations_like': '❤️ Add to favorites',
      'recommendations_liked': 'In favorites',
      'recommendations_error': 'Search or add error',
      'recommendations_login_required': 'Login required',
      'recommendations_success_like': 'Added to favorites!',
      'favorites_loading': 'Loading favorites...',
      'favorites_error': 'Failed to load favorites',
      'favorites_empty': 'You have no favorite songs.',
      'favorites_delete': 'Remove from favorites',
      'favorites_deleted': 'Song removed from favorites',
      'favorites_date_added': 'Added',
      
      // Favorites detailed
      'favorites_title': 'Your Favorites',
      'favorites_login_required': 'Please login to view your favorites',
      'favorites_load_failed': 'Failed to load favorites',
      'favorites_load_error': 'Error loading favorites',
      'favorites_no_songs': 'No favorites yet',
      'favorites_start_liking': 'Start liking songs to see them here!',
      'favorites_count_single': 'saved song',
      'favorites_count_multiple': 'saved songs',
      'favorites_removing': 'Removing...',
      'favorites_delete_failed': 'Failed to remove from favorites',
      'favorites_delete_error': 'Error removing from favorites',
      
      // Interactive Studio
      'studio_main_title': 'Interactive Music Studio',
      'studio_main_subtitle': 'Analyze your media, discover music, and generate personal tracks',
      'studio_upload_title': 'Upload Your Media',
      'studio_upload_description': 'Upload a photo or video to analyze its mood and get personalized music recommendations',
      'studio_upload_click': 'Click to upload',
      'studio_upload_drag': 'or drag and drop',
      'studio_upload_hint': 'Supports images and videos',
      'studio_analyze': 'Analyze Media',
      'studio_analyzing': 'Analyzing...',
      'studio_reset': 'Reset',
      'studio_mood_title': 'Mood Analysis',
      'studio_mood_description': "Here's what we found about your media's mood and energy",
      'studio_primary_mood': 'Primary Mood and Description',
      'studio_emotions': 'Emotions',
      'studio_musical_attributes': 'Musical Attributes',
      'studio_energy': 'Energy',
      'studio_valence': 'Valence',
      'studio_danceability': 'Danceability',
      'studio_get_recommendations': 'Get Music Recommendations',
      'studio_getting_recommendations': 'Getting Recommendations...',
      'studio_generate_beat': 'Create Personal Music',
      'studio_generating_beat': 'Creating Personal Music...',
      'studio_recommendations_title': 'Music Recommendations',
      'studio_recommendations_description': 'Curated music based on your media\'s mood analysis',
      'studio_personal_tab': 'Personal (Based on your favorites)',
      'studio_global_tab': 'Global (Popular matches)',
      'studio_match_score': 'match',
      'studio_like': 'Like',
      'studio_liked': 'Liked',
      'studio_beat_title': 'Your Personal Music',
      'studio_beat_description': 'AI-generated music based on your media\'s mood',
      'studio_beat_generating': 'Creating your personal music...',
      'studio_beat_wait': 'This may take a few minutes. We\'re creating something special!',
      'studio_beat_ready': 'Your Personal Music is Ready! 🎉',
      'studio_analysis_success': 'Media analysis complete! Scroll down to see results.',
      'studio_recommendations_success': 'Recommendations generated!',
      'studio_beat_failed': 'Failed to create personal music',
      'studio_beat_timeout': 'Music generation timeout',
      'studio_beat_status_error': 'Error checking generation status',
      
      // Dashboard tabs
      'dashboard_studio': 'Studio',
      'dashboard_search': 'Search',
      'dashboard_favorites': 'Favorites',

      // Search Page
      'search_title': 'Music Search',
      'search_subtitle': 'Find any song or artist on YouTube',
      'search_placeholder': 'Enter a song title or artist...',
      'search_button': 'Search',
      'search_loading': 'Searching...',
      'search_no_results_title': 'Nothing Found',
      'search_no_results_subtitle': 'Try changing your search query.',

      // Profile
      'basic_account': 'Basic',
      'unlimited': 'Unlimited',
      'retry': 'Try again',
      'profile_not_found': 'Profile not found',
      'back_to_dashboard': 'Back to dashboard',
      'account_type': 'Account type',
      'daily_analyses': 'Today\'s analyses',
      'registration_method': 'Registration method',
      'google_oauth': 'Google OAuth',
      'email_registration': 'Email registration',
      'registration_date': 'Registration date',
      'upgrade_to_pro': 'Upgrade to PRO',
      'pro_benefits': 'Unlimited analyses, priority support and additional features',
      'upgrade_now': 'Upgrade now',
      'enter_name': 'Enter name',
      
      // Limit modal
      'limit_exceeded_title': 'Limit Exceeded',
      'limit_exceeded_message': 'You have exceeded your daily analysis limit (3/3). You can:',
      'wait_tomorrow': 'Wait until tomorrow (limit resets at 00:00)',
      'upgrade_for_unlimited': 'Upgrade to PRO for unlimited analyses',
      'current_usage': 'Current usage',
      
      // Landing page
      'landing_hero_title': 'Your AI Music Assistant',
      'landing_hero_description': 'Upload a photo or video, and our AI will create a personalized music playlist that matches your mood and the atmosphere of the moment',
      'landing_try_free': 'Try for Free',
      'landing_learn_more': 'Learn More',
      'landing_how_it_works': 'How It Works?',
      'landing_upload_media': 'Upload Media',
      'landing_upload_description': 'Send a photo or video that reflects your mood',
      'landing_ai_analysis': 'AI Analysis',
      'landing_ai_description': 'Our AI analyzes visual elements and determines the mood',
      'landing_personal_playlist': 'Personal Playlist',
      'landing_playlist_description': 'Get a curated selection of tracks perfectly suited to the moment',
      'landing_examples': 'Examples',
      'landing_sunset_beach': 'Beach Sunset',
      'landing_sunset_music': 'Chill-hop, Ambient, Lounge',
      'landing_party_friends': 'Party with Friends',
      'landing_party_music': 'Pop, Dance, Hip-hop',
      'landing_forest_walk': 'Forest Walk',
      'landing_forest_music': 'Indie, Folk, Acoustic',
      'landing_ready_discover': 'Ready to Discover New Music?',
      'landing_join_users': 'Join thousands of users who have already discovered perfect tracks',
      'landing_start_now': 'Start Now',
      'landing_footer_brand': 'AI Music',
      'landing_footer_tagline': 'Music by Mood',
      'landing_footer_product': 'Product',
      'landing_footer_features': 'Features',
      'landing_footer_examples': 'Examples',
      'landing_footer_support': 'Support',
      'landing_footer_help': 'Help',
      'landing_footer_contacts': 'Contacts',
    }
  },
  kz: {
    translation: {
      'login': 'Кіру',
      'logout': 'Шығу',
      'loading': 'Жүктелуде...',
      'processing': 'Өңделуде...',
      'back': 'Артқа',
      'or': 'немесе',
      'register': 'Тіркелу',
      'register_login': 'Тіркелу / Кіру',
      'already_have_account': 'Аккаунтыңыз бар ма? Кіру',
      'no_account': 'Аккаунтыңыз жоқ па? Тіркелу',
      'username': 'Пайдаланушы аты',
      'enter_username': 'Пайдаланушы атын енгізіңіз',
      'password': 'Құпия сөз',
      'enter_password': 'Құпия сөзді енгізіңіз',
      'welcome': 'Музыкалық талдау және AI көмекші',
      'what_can_do': 'Aivi не істей алады?',
      'analyze_music': 'Музыкалық талдауыңыз',
      'ai_chat': 'Фото/видео талдау үшін AI чат',
      'music_recommend': 'Контентіңізге арналған музыка ұсыныстары',
      'modern_ui': 'Заманауи интерфейс',
      'secure_login': 'Қауіпсіз тіркелу және кіру',
      'analyzing_music': 'Музыкалық талдауыңыз жүргізілуде ⏳',
      'light_theme': 'Жарық тақырып',
      'dark_theme': 'Қараңғы тақырып',
      'profile': 'Профиль',
      'name': 'Аты',
      'country': 'Ел',
      'music_analysis': 'Музыкалық талдау',
      'overall_mood': 'Жалпы көңіл-күй',
      'positivity': 'Позитивтілік',
      'energy': 'Энергия',
      'danceability': 'Би мүмкіндігі',
      'tempo': 'Темп',
      'favorite_artists': 'Сүйікті орындаушылар',
      'total_tracks_analyzed': 'Талдаудан өткен тректер',
      'top_tracks': 'Үздік тректер',
      'ai_helper_title': 'Музыкалық AI көмекші',
      'ai_helper_subtitle': 'Көңіл-күйді талдау үшін фото немесе видео жіберіңіз',
      'ai_lang_label': 'AI чат тілі:',
      'recommendations_search_placeholder': 'Атауы, орындаушысы, вайбы бойынша іздеу...',
      'recommendations_search_button': 'Іздеу',
      'recommendations_searching': 'Іздеуде...',
      'recommendations_like': '❤️ Таңдаулыға қосу',
      'recommendations_liked': 'Таңдаулыда',
      'recommendations_error': 'Іздеу немесе қосу қатесі',
      'recommendations_login_required': 'Кіру қажет',
      'recommendations_success_like': 'Таңдаулыға қосылды!',
      'favorites_loading': 'Таңдаулылар жүктелуде...',
      'favorites_error': 'Таңдаулыларды жүктеу қатесі',
      'favorites_empty': 'Сізде таңдаулы әндер жоқ.',
      'favorites_delete': 'Таңдаулыдан өшіру',
      'favorites_deleted': 'Ән таңдаулылардан өшірілді',
      'favorites_date_added': 'Қосылған күні',
      
      // Favorites detailed
      'favorites_title': 'Сіздің таңдаулыларыңыз',
      'favorites_login_required': 'Таңдаулыларды көру үшін кіріңіз',
      'favorites_load_failed': 'Таңдаулыларды жүктеу сәтсіз',
      'favorites_load_error': 'Таңдаулыларды жүктеу қатесі',
      'favorites_no_songs': 'Әлі таңдаулылар жоқ',
      'favorites_start_liking': 'Мұнда көру үшін әндерге лайк бастаңыз!',
      'favorites_count_single': 'сақталған ән',
      'favorites_count_multiple': 'сақталған ән',
      'favorites_removing': 'Жойылуда...',
      'favorites_delete_failed': 'Таңдаулыдан жою сәтсіз',
      'favorites_delete_error': 'Таңдаулыдан жою қатесі',
      
      // Interactive Studio
      'studio_main_title': 'Интерактивті музыкалық студия',
      'studio_main_subtitle': 'Медианызды талдаңыз, музыканы ашыңыз және жеке трекшелер жасаңыз',
      'studio_upload_title': 'Медиафайлыңызды жүктеңіз',
      'studio_upload_description': 'Көңіл-күйді талдау және жеке музыкалық ұсыныстар алу үшін фото немесе видео жүктеңіз',
      'studio_upload_click': 'Жүктеу үшін басыңыз',
      'studio_upload_drag': 'немесе файлды осында апарыңыз',
      'studio_upload_hint': 'Суреттер мен видеоларды қолдайды',
      'studio_analyze': 'Медианы талдау',
      'studio_analyzing': 'Талдауда...',
      'studio_reset': 'Қалпына келтіру',
      'studio_mood_title': 'Көңіл-күй талдауы',
      'studio_mood_description': 'Міне, сіздің медианың көңіл-күйі мен энергиясы туралы біз тапқан мәліметтер',
      'studio_primary_mood': 'Негізгі көңіл-күй және сипаттамасы',
      'studio_emotions': 'Эмоциялар',
      'studio_musical_attributes': 'Музыкалық қасиеттер',
      'studio_energy': 'Энергия',
      'studio_valence': 'Позитивтілік',
      'studio_danceability': 'Би мүмкіндігі',
      'studio_get_recommendations': 'Музыкалық ұсыныстар алу',
      'studio_getting_recommendations': 'Ұсыныстар алуда...',
      'studio_generate_beat': 'Жеке музыка жасау',
      'studio_generating_beat': 'Жеке музыка жасауда...',
      'studio_recommendations_title': 'Музыкалық ұсыныстар',
      'studio_recommendations_description': 'Сіздің медианың көңіл-күй талдауына негізделген таңдалған музыка',
      'studio_personal_tab': 'Жеке (Сіздің таңдаулыларыңыз негізінде)',
      'studio_global_tab': 'Жаһандық (Танымал сәйкестіктер)',
      'studio_match_score': 'сәйкестік',
      'studio_like': 'Ұнату',
      'studio_liked': 'Ұнады',
      'studio_beat_title': 'Сіздің жеке музыкаңыз',
      'studio_beat_description': 'Сіздің медианың көңіл-күйіне негізделген AI жасаған музыка',
      'studio_beat_generating': 'Сіздің жеке музыкаңызды жасауда...',
      'studio_beat_wait': 'Бұл бірнеше минут уақыт алуы мүмкін. Біз ерекше нәрсе жасап жатырмыз!',
      'studio_beat_ready': 'Сіздің жеке музыкаңыз дайын! 🎉',
      'studio_analysis_success': 'Медиа талдауы аяқталды! Нәтижелерді көру үшін төмен жылжытыңыз.',
      'studio_recommendations_success': 'Ұсыныстар жасалды!',
      'studio_beat_failed': 'Жеке музыка жасау сәтсіз аяқталды',
      'studio_beat_timeout': 'Музыка жасау уақыты біткен',
      'studio_beat_status_error': 'Генерация статусын тексеру қатесі',
      
      // Dashboard tabs
      'dashboard_studio': 'Студия',
      'dashboard_search': 'Іздеу',
      'dashboard_favorites': 'Таңдаулылар',
      
      // Search Page
      'search_title': 'Сіздің AI музыка көмекшісі',
      'search_subtitle': 'Фото немесе видео жүктеңіз, біздің AI сіздің көңіл-күйіңіз бен сәттің атмосферасына сәйкес келетін жеке музыкалық тізімді жасайды',
      'search_placeholder': 'Көңіл-күйіңізді көрсететін фото немесе видео жіберіңіз',
      'search_button': 'Тегін сынап көріңіз',
      'search_loading': 'Тегін сынап көріңіз',
      'search_no_results_title': 'Ничего не найдено',
      'search_no_results_subtitle': 'Попробуйте изменить ваш поисковый запрос.',

      // Profile
      'basic_account': 'Қарапайым',
      'unlimited': 'Шексіз',
      'retry': 'Қайталап көру',
      'profile_not_found': 'Профиль табылмады',
      'back_to_dashboard': 'Дашбордқа қайту',
      'account_type': 'Аккаунт түрі',
      'daily_analyses': 'Бүгінгі талдаулар',
      'registration_method': 'Тіркелу тәсілі',
      'google_oauth': 'Google OAuth',
      'email_registration': 'Email тіркелуі',
      'registration_date': 'Тіркелу күні',
      'upgrade_to_pro': 'PRO-ға өту',
      'pro_benefits': 'Шексіз талдаулар, басымды қолдау және қосымша мүмкіндіктер',
      'upgrade_now': 'Қазір PRO-ға өту',
      'enter_name': 'Атыңызды енгізіңіз',
      
      // Limit modal
      'limit_exceeded_title': 'Лимит таусылды',
      'limit_exceeded_message': 'Сіздің бүгінгі талдау лимитіңіз таусылды (3/3). Сіз мыналарды жасай аласыз:',
      'wait_tomorrow': 'Ертеңге дейін күту (лимит 00:00-де жаңарады)',
      'upgrade_for_unlimited': 'Шексіз талдау үшін PRO-ға өту',
      'current_usage': 'Ағымдағы пайдалану',
      
      // Landing page
      'landing_hero_title': 'Сіздің AI музыка көмекшісі',
      'landing_hero_description': 'Фото немесе видео жүктеңіз, біздің AI сіздің көңіл-күйіңіз бен сәттің атмосферасына сәйкес келетін жеке музыкалық тізімді жасайды',
      'landing_try_free': 'Тегін сынап көріңіз',
      'landing_learn_more': 'Толығырақ білу',
      'landing_how_it_works': 'Бұл қалай жұмыс істейді?',
      'landing_upload_media': 'Медиа жүктеу',
      'landing_upload_description': 'Көңіл-күйіңізді көрсететін фото немесе видео жіберіңіз',
      'landing_ai_analysis': 'AI талдау',
      'landing_ai_description': 'Біздің AI көрнекі элементтерді талдайды және көңіл-күйді анықтайды',
      'landing_personal_playlist': 'Жеке тізім',
      'landing_playlist_description': 'Сәтке қатысты мінсіз таңдалған трек жинағын алыңыз',
      'landing_examples': 'Мысалдар',
      'landing_sunset_beach': 'Жағалаудағы күн батуы',
      'landing_sunset_music': 'Чил-хоп, Эмбиент, Лаунж',
      'landing_party_friends': 'Достармен кеш',
      'landing_party_music': 'Поп, Данс, Хип-хоп',
      'landing_forest_walk': 'Орман серуені',
      'landing_forest_music': 'Инди, Фолк, Акустика',
      'landing_ready_discover': 'Жаңа музыканы ашуға дайынсыз ба?',
      'landing_join_users': 'Мінсіз трекшелерді тапқан мыңдаған пайдаланушыларға қосылыңыз',
      'landing_start_now': 'Қазір бастау',
      'landing_footer_brand': 'AI Музыка',
      'landing_footer_tagline': 'Көңіл-күй бойынша музыка',
      'landing_footer_product': 'Өнім',
      'landing_footer_features': 'Мүмкіндіктер',
      'landing_footer_examples': 'Мысалдар',
      'landing_footer_support': 'Қолдау',
      'landing_footer_help': 'Көмек',
      'landing_footer_contacts': 'Байланыстар',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('lang') || 'ru',
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n; 