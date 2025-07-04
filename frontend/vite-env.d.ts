interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_API_BASE_URL: string
    readonly VITE_SPOTIFY_REDIRECT_URI: string
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
  