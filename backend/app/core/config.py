from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CONCEPTLENS"
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "conceptlens"
    SECRET_KEY: str = "supersecretkey" # In production, use env var
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days — aligns with session lifetime
    ANALYTICS_MODE: str = "demo" # "demo" or "production"
    GEMINI_API_KEY: str | None = None
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]

    class Config:
        env_file = ".env"

settings = Settings()
