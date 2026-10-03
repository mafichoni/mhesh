from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core
    ENV: str = "development"
    DATABASE_URL: str = "postgresql+asyncpg://mhesh:mhesh@localhost:5432/mhesh"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7
    CORS_ORIGINS: str = "http://localhost:3000,https://mhesh.app,https://www.mhesh.app"
    ADMIN_EMAILS: str = "wainaina.mungai@gmail.com"

    # R2 storage
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET: str = "mafichoni"
    R2_PUBLIC_BASE_URL: str = ""

    # WhatsApp Cloud API
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""

    # Email (Resend)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Mhesh <no-reply@mhesh.app>"

    # M-Pesa Daraja
    MPESA_ENV: str = "sandbox"
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = ""
    MPESA_PASSKEY: str = ""
    MPESA_CALLBACK_URL: str = ""
    MPESA_CALLBACK_SECRET: str = ""

    # M-Pesa B2C (for escrow release)
    MPESA_B2C_SHORTCODE: str = ""
    MPESA_B2C_INITIATOR_NAME: str = ""
    MPESA_B2C_SECURITY_CREDENTIAL: str = ""
    MPESA_B2C_COMMAND_ID: str = "BusinessPayment"
    MPESA_B2C_RESULT_URL: str = ""
    MPESA_B2C_QUEUE_URL: str = ""

    # GPU + LLM inference
    WAN_INFERENCE_URL: str = ""
    WAN_INFERENCE_TOKEN: str = ""
    LLM_INFERENCE_URL: str = ""
    LLM_INFERENCE_TOKEN: str = ""

    # Mhesh
    MHESH_PUBLIC_URL: str = "https://mhesh.app"
    MHESH_ODPC_REGISTERED: bool = False
    MHESH_BLACKOUT_START: str = "2027-08-05T00:00:00+03:00"
    MHESH_BLACKOUT_END: str = "2027-08-11T00:00:00+03:00"
    MHESH_VERIFY_KES: int = 1
    MHESH_IMAGE_COST_KES: int = 200
    MHESH_ESCROW_FEE_PCT: float = 0.03
    MHESH_PLATFORM_FEE_PCT: float = 0.02
    MHESH_PARTNER_REFERRAL_PCT: float = 0.12
    MHESH_DAILY_GEN_LIMIT: int = 20
    MHESH_DAILY_PROFILE_UPDATE_LIMIT: int = 5
    MHESH_DAILY_TASK_APPLY_LIMIT: int = 10
    MHESH_VERIFIED_TIER_KES: int = 0
    MHESH_FEATURED_TIER_KES: int = 0
    MHESH_PARTNER_AUTO_ACTIVATE: bool = False
    MHESH_NAME_MATCH_THRESHOLD: int = 80
    MHESH_CRON_INTERVAL_S: int = 6 * 60 * 60
    MHESH_BLACKOUT_CHECK_INTERVAL_S: int = 15 * 60


@lru_cache
def get_settings() -> Settings:
    return Settings()
