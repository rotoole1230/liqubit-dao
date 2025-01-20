# src/data/sources.py
from typing import Dict, Any, Optional
import aiohttp
import asyncio
from abc import ABC, abstractmethod
from ..utils.config import Config

class DataSource(ABC):
    @abstractmethod
    async def fetch_market_data(self, token: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def fetch_token_info(self, token: str) -> Optional[Dict[str, Any]]:
        pass

class CoinGeckoSource(DataSource):
    def __init__(self):
        self.base_url = Config.COINGECKO_BASE_URL
        self.api_key = Config.COINGECKO_API_KEY
        self.headers = {
            'x-cg-pro-api-key': self.api_key,
            'accept': 'application/json'
        }

    async def fetch_market_data(self, token: str) -> Dict[str, Any]:
        """Fetch market data from CoinGecko"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/simple/price",
                params={
                    'ids': token.lower(),
                    'vs_currencies': 'usd',
                    'include_market_cap': 'true',
                    'include_24hr_vol': 'true',
                    'include_24hr_change': 'true'
                },
                headers=self.headers
            ) as response:
                if response.status != 200:
                    raise Exception(f"CoinGecko API error: {await response.text()}")

                data = await response.json()
                token_data = data.get(token.lower(), {})

                return {
                    'price': token_data.get('usd', 0),
                    'market_cap': token_data.get('usd_market_cap', 0),
                    'volume_24h': token_data.get('usd_24h_vol', 0),
                    'price_change_24h': token_data.get('usd_24h_change', 0)
                }

    async def fetch_token_info(self, token: str) -> Optional[Dict[str, Any]]:
        """Fetch token information from CoinGecko"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/coins/{token.lower()}",
                headers=self.headers
            ) as response:
                if response.status != 200:
                    return None

                data = await response.json()
                return {
                    'name': data.get('name'),
                    'symbol': data.get('symbol'),
                    'description': data.get('description', {}).get('en'),
                    'homepage': data.get('links', {}).get('homepage', [])[0],
                    'github': data.get('links', {}).get('repos_url', {}).get('github', []),
                    'categories': data.get('categories', []),
                    'market_cap_rank': data.get('market_cap_rank')
                }

class CookieFunSource(DataSource):
    def __init__(self):
        self.base_url = Config.COOKIE_FUN_BASE_URL
        self.api_key = Config.COOKIE_FUN_API_KEY
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

    async def fetch_market_data(self, token: str) -> Dict[str, Any]:
        """Fetch market data from Cookie.fun"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/v1/tokens/{token}/market",
                headers=self.headers
            ) as response:
                if response.status != 200:
                    raise Exception(f"Cookie.fun API error: {await response.text()}")

                data = await response.json()
                return {
                    'price': data.get('price', 0),
                    'market_cap': data.get('marketCap', 0),
                    'volume_24h': data.get('volume24h', 0),
                    'price_change_24h': data.get('priceChange24h', 0),
                    'liquidity': data.get('liquidity', 0),
                    'holders': data.get('holders', 0)
                }

    async def fetch_token_info(self, token: str) -> Optional[Dict[str, Any]]:
        """Fetch token information from Cookie.fun"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/v1/tokens/{token}/info",
                headers=self.headers
            ) as response:
                if response.status != 200:
                    return None

                data = await response.json()
                return {
                    'name': data.get('name'),
                    'symbol': data.get('symbol'),
                    'chain': data.get('chain'),
                    'contract_address': data.get('contractAddress'),
                    'total_supply': data.get('totalSupply'),
                    'decimals': data.get('decimals'),
                    'website': data.get('website'),
                    'social': data.get('social', {})
                }