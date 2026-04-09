from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # API
    API_TITLE: str = "AI Travel Planner"
    API_VERSION: str = "1.0.0"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./travel_planner.db"
    
    # Gemini
    GEMINI_API_KEY: str = ""
    
    # OpenRouter
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-oss-20b:free"
    
    # Unsplash
    UNSPLASH_ACCESS_KEY: str = ""
    
    # Cache
    CACHE_DIR: str = "./cache"
    CACHE_TTL_HOURS: int = 24
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    FRONTEND_URL: str = "https://tabi-ito.vercel.app"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
