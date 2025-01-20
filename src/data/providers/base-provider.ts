// src/data/providers/base-provider.ts
export interface MarketData {
  price: number;
  volume: number;
  marketCap: number;
  change24h: number;
  lastUpdated: Date;
}

export interface TokenData extends MarketData {
  symbol: string;
  name: string;
  chain: string;
}

export abstract class BaseDataProvider {
  abstract getName(): string;
  abstract getMarketData(symbol: string): Promise<MarketData>;
  abstract isSupported(symbol: string): Promise<boolean>;
}

// src/data/providers/coingecko.ts
import { BaseDataProvider, MarketData } from './base-provider';

export class CoinGeckoProvider extends BaseDataProvider {
  private apiKey: string;
  private baseUrl: string = 'https://api.coingecko.com/api/v3';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'CoinGecko';
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${symbol}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
        {
          headers: {
            'x-cg-pro-api-key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();
      const tokenData = data[symbol];

      return {
        price: tokenData.usd,
        volume: tokenData.usd_24h_vol,
        marketCap: tokenData.usd_market_cap,
        change24h: tokenData.usd_24h_change,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`Error fetching data from CoinGecko: ${error}`);
      throw error;
    }
  }

  async isSupported(symbol: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/simple/supported_vs_currencies`);
      const supportedCurrencies = await response.json();
      return supportedCurrencies.includes(symbol.toLowerCase());
    } catch {
      return false;
    }
  }
}

// src/data/providers/cookie-fun.ts
import { BaseDataProvider, MarketData } from './base-provider';

export class CookieFunProvider extends BaseDataProvider {
  private apiKey: string;
  private baseUrl: string = 'https://api.cookie.fun';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'Cookie.fun';
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/tokens/${symbol}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Cookie.fun API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        price: data.price,
        volume: data.volume24h,
        marketCap: data.marketCap,
        change24h: data.priceChange24h,
        lastUpdated: new Date(data.lastUpdated),
      };
    } catch (error) {
      console.error(`Error fetching data from Cookie.fun: ${error}`);
      throw error;
    }
  }

  async isSupported(symbol: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/tokens/${symbol}/exists`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

// src/data/market-service.ts
import { BaseDataProvider, MarketData } from './providers/base-provider';
import { CoinGeckoProvider } from './providers/coingecko';
import { CookieFunProvider } from './providers/cookie-fun';

export class MarketService {
  private providers: BaseDataProvider[];

  constructor() {
    this.providers = [
      new CoinGeckoProvider(process.env.COINGECKO_API_KEY || ''),
      new CookieFunProvider(process.env.COOKIE_FUN_API_KEY || ''),
    ];
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    let lastError: Error | null = null;

    // Try each provider until we get data
    for (const provider of this.providers) {
      try {
        if (await provider.isSupported(symbol)) {
          return await provider.getMarketData(symbol);
        }
      } catch (error) {
        console.error(`Error with provider ${provider.getName()}: ${error}`);
        lastError = error as Error;
      }
    }

    throw lastError || new Error(`No provider could fetch data for ${symbol}`);
  }

  async getSupportedTokens(): Promise<string[]> {
    // Implementation depends on your needs
    return ['BTC', 'ETH', 'SOL', 'LIQ']; // Example
  }
}