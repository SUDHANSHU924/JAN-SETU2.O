from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""
    
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    
    # JWT/Auth Configuration
    SECRET_KEY: str = ""
    JWT_SECRET: str = ""  # Fallback JWT secret for backward compatibility
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Twilio Configuration (SMS)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # Positionstack (Geolocation)
    POSITIONSTACK_API_KEY: str = ""
    POSITIONSTACK_BASE_URL: str = "http://api.positionstack.com/v1"

    # Firebase Admin SDK (backend token verification)
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""
    FIREBASE_PROJECT_ID: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    # Pydantic v2 configuration
    model_config = ConfigDict(env_file=".env", extra="ignore")


settings = Settings()
