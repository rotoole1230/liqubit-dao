# src/analysis/market.py
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import asyncio
from ..data.sources import CoinGeckoSource, CookieFunSource
from ..utils.config import Config

class MarketAnalysis:
    def __init__(self):
        self.coingecko = CoinGeckoSource()
        self.cookie_fun = CookieFunSource()
        self.supported_timeframes = ['1h', '24h', '7d', '30d']
        self.cache = {}
        self.cache_ttl = Config.CACHE_TTL

    async def _get_market_data(self, token: str) -> Dict[str, Any]:
        """Fetch market data from multiple sources and combine them"""
        try:
            # Try cookie.fun first
            cookie_data = await self.cookie_fun.fetch_market_data(token)
            if cookie_data:
                return cookie_data
        except Exception as e:
            print(f"Cookie.fun fetch failed: {e}")

        try:
            # Fallback to CoinGecko
            return await self.coingecko.fetch_market_data(token)
        except Exception as e:
            raise Exception(f"Failed to fetch market data for {token}: {e}")

    async def _get_token_info(self, token: str) -> Optional[Dict[str, Any]]:
        """Fetch token metadata and information"""
        try:
            return await self.cookie_fun.fetch_token_info(token)
        except:
            return await self.coingecko.fetch_token_info(token)

    async def analyze_token(self, token: str, timeframe: str = '24h') -> Dict[str, Any]:
        """Perform comprehensive token analysis"""
        if timeframe not in self.supported_timeframes:
            raise ValueError(f"Unsupported timeframe. Use one of: {', '.join(self.supported_timeframes)}")

        cache_key = f"{token}_{timeframe}"
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            if (datetime.now() - cached_data['timestamp']).seconds < self.cache_ttl:
                return cached_data['data']

        # Fetch data concurrently
        market_data, token_info = await asyncio.gather(
            self._get_market_data(token),
            self._get_token_info(token)
        )

        analysis = {
            'token': token,
            'timestamp': datetime.now().isoformat(),
            'timeframe': timeframe,
            'market_data': market_data,
            'token_info': token_info,
            'metrics': {
                'price': market_data.get('price', 0),
                'volume_24h': market_data.get('volume_24h', 0),
                'market_cap': market_data.get('market_cap', 0),
                'price_change_24h': market_data.get('price_change_24h', 0),
            }
        }

        # Cache the results
        self.cache[cache_key] = {
            'data': analysis,
            'timestamp': datetime.now()
        }

        return analysis

    async def compare_tokens(self, tokens: List[str], timeframe: str = '24h') -> Dict[str, Any]:
        """Compare multiple tokens"""
        analyses = await asyncio.gather(
            *[self.analyze_token(token, timeframe) for token in tokens]
        )

        comparison = {
            'timestamp': datetime.now().isoformat(),
            'timeframe': timeframe,
            'tokens': {
                analysis['token']: {
                    'price': analysis['metrics']['price'],
                    'volume_24h': analysis['metrics']['volume_24h'],
                    'market_cap': analysis['metrics']['market_cap'],
                    'price_change_24h': analysis['metrics']['price_change_24h']
                } for analysis in analyses
            }
        }

        return comparison

    def clear_cache(self):
        """Clear the analysis cache"""
        self.cache = {}