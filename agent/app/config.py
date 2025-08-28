import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    STUB_MODE: bool = os.getenv("STUB_MODE", "true").lower() == "true" or not GEMINI_API_KEY
    PROVIDER: str = "gemini" if not STUB_MODE else "stub"
    MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    PROMPT_VERSION: str = "v3"  # Updated for enhanced formatted responses
    MAX_ARTICLES: int = int(os.getenv("MAX_ARTICLES", "3"))
    
    # Auto-close configuration (defaults match server-side Config model)
    AUTO_CLOSE_ENABLED: bool = os.getenv("AUTO_CLOSE_ENABLED", "true").lower() == "true"
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.78"))
    
    # Enhanced KB matching settings
    ENHANCED_SEARCH_ENABLED: bool = os.getenv("ENHANCED_SEARCH_ENABLED", "true").lower() == "true"
    RELEVANCE_THRESHOLD: float = float(os.getenv("RELEVANCE_THRESHOLD", "1.0"))
    SEMANTIC_WEIGHT: float = float(os.getenv("SEMANTIC_WEIGHT", "0.3"))
    KEYWORD_WEIGHT: float = float(os.getenv("KEYWORD_WEIGHT", "0.7"))
    
    # Response formatting settings
    STRICT_FORMATTING: bool = os.getenv("STRICT_FORMATTING", "true").lower() == "true"
    MAX_RESPONSE_WORDS: int = int(os.getenv("MAX_RESPONSE_WORDS", "400"))
    MIN_RESPONSE_WORDS: int = int(os.getenv("MIN_RESPONSE_WORDS", "50"))
    REQUIRE_NUMBERED_STEPS: bool = os.getenv("REQUIRE_NUMBERED_STEPS", "true").lower() == "true"
    REQUIRE_CITATIONS: bool = os.getenv("REQUIRE_CITATIONS", "true").lower() == "true"

settings = Settings()
