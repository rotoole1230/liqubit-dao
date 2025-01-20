# src/utils/config.py
from typing import Dict
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GROQ_API_KEY: str = os.getenv('GROQ_API_KEY', '')
    COINGECKO_API_KEY: str = os.getenv('COINGECKO_API_KEY', '')
    COOKIE_FUN_API_KEY: str = os.getenv('COOKIE_FUN_API_KEY', '')

    SUPPORTED_CHAINS = ['solana', 'base']
    DEFAULT_TIMEFRAME = '24h'

    # API endpoints
    COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3'
    COOKIE_FUN_BASE_URL = 'https://api.cookie.fun'

    # Cache settings
    CACHE_TTL = 300  # 5 minutes

    @staticmethod
    def get_api_keys() -> Dict[str, str]:
        return {
            'groq': Config.GROQ_API_KEY,
            'coingecko': Config.COINGECKO_API_KEY,
            'cookie_fun': Config.COOKIE_FUN_API_KEY
        }

# src/utils/__init__.py
from .config import Config

__all__ = ['Config']