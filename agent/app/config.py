import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    STUB_MODE: bool = os.getenv("STUB_MODE", "true").lower() == "true" or not GEMINI_API_KEY
    PROVIDER: str = "gemini" if not STUB_MODE else "stub"
    MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    PROMPT_VERSION: str = "v2"  # Updated for enhanced agentic workflow
    MAX_ARTICLES: int = int(os.getenv("MAX_ARTICLES", "3"))
    
    # Auto-close configuration (defaults match server-side Config model)
    AUTO_CLOSE_ENABLED: bool = os.getenv("AUTO_CLOSE_ENABLED", "true").lower() == "true"
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.78"))

settings = Settings()
