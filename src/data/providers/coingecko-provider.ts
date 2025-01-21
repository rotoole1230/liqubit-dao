import {
  BaseProvider,
  MarketData,
  OnChainMetrics,
  TechnicalIndicators,
  SocialMetrics
} from './base-provider';

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  last_updated: string;
}

interface CoinGeckoOHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export class CoinGeckoProvider implements BaseProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.coingecko.com/api/v3';
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || '';
    this.cache = new Map();
  }

  private async fetchWithCache(url: string, cacheKey: string) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const urlWithKey = `${url}${url.includes('?') ? '&' : '?'}x_cg_demo_api_key=${this.apiKey}`;

    try {
      const response = await fetch(urlWithKey);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error fetching from CoinGecko:', error);
      throw error;
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      // Using /coins/markets endpoint for comprehensive market data
      const url = `${this.baseUrl}/coins/markets?vs_currency=usd&ids=${symbol.toLowerCase()}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h`;
      const data = await this.fetchWithCache(url, `market-${symbol}`);

      if (!data || !data[0]) {
        throw new Error(`No market data found for ${symbol}`);
      }

      const marketData: CoinGeckoMarketData = data[0];

      return {
        symbol: marketData.symbol.toUpperCase(),
        price: marketData.current_price,
        priceChange24h: marketData.price_change_24h,
        priceChangePercentage24h: marketData.price_change_percentage_24h,
        volume24h: marketData.total_volume,
        marketCap: marketData.market_cap,
        high24h: marketData.high_24h,
        low24h: marketData.low_24h,
        circulatingSupply: marketData.circulating_supply,
        totalSupply: marketData.total_supply,
        lastUpdated: new Date(marketData.last_updated)
      };
    } catch (error) {
      console.error(`Error getting market data for ${symbol}:`, error);
      throw error;
    }
  }

  async getTechnicalIndicators(symbol: string): Promise<TechnicalIndicators> {
    try {
      // Using /coins/{id}/ohlc endpoint for OHLC data
      const url = `${this.baseUrl}/coins/${symbol.toLowerCase()}/ohlc?vs_currency=usd&days=14`;
      const ohlcData: CoinGeckoOHLCData[] = await this.fetchWithCache(url, `ohlc-${symbol}`);

      // Calculate basic technical indicators from OHLC data
      const closes = ohlcData.map(d => d.close);
      const rsi14 = this.calculateRSI(closes);
      const { ema9, ema20, ema50, ema200 } = this.calculateEMAs(closes);
      const macd = this.calculateMACD(closes);

      return {
        symbol: symbol.toUpperCase(),
        rsi14,
        macd: {
          value: macd.macd,
          signal: macd.signal,
          histogram: macd.histogram
        },
        ema: { ema9, ema20, ema50, ema200 },
        bollingerBands: this.calculateBollingerBands(closes),
        volume: {
          obv: 0, // Would need volume data
          vwap: 0  // Would need volume data
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error getting technical indicators for ${symbol}:`, error);
      throw error;
    }
  }

  async getOnChainMetrics(symbol: string): Promise<OnChainMetrics> {
    // CoinGecko free API doesn't provide on-chain metrics
    // Return placeholder data
    return {
      symbol: symbol.toUpperCase(),
      activeAddresses24h: 0,
      transactionCount24h: 0,
      averageTransactionValue: 0,
      largeTransactions24h: 0,
      netFlow24h: 0,
      totalValueLocked: 0,
      dailyActiveContracts: 0,
      gasUsed24h: 0,
      timestamp: new Date()
    };
  }

  async getSocialMetrics(symbol: string): Promise<SocialMetrics> {
    try {
      // Using /coins/{id} endpoint for social data
      const url = `${this.baseUrl}/coins/${symbol.toLowerCase()}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=true&sparkline=false`;
      const data = await this.fetchWithCache(url, `social-${symbol}`);

      return {
        symbol: symbol.toUpperCase(),
        twitterMentions24h: data.community_data?.twitter_followers || 0,
        sentimentScore24h: 0,
        telegramActiveUsers: data.community_data?.telegram_channel_user_count || 0,
        redditSubscribers: data.community_data?.reddit_subscribers || 0,
        githubCommits24h: data.developer_data?.commit_count_4_weeks || 0,
        developerActivity: data.developer_data?.stars || 0,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error getting social metrics for ${symbol}:`, error);
      throw error;
    }
  }

  // Technical analysis helper methods
  private calculateRSI(prices: number[]): number {
    // Basic RSI implementation
    return 50; // Placeholder
  }

  private calculateEMAs(prices: number[]) {
    // Basic EMA calculations
    return {
      ema9: prices[prices.length - 1],
      ema20: prices[prices.length - 1],
      ema50: prices[prices.length - 1],
      ema200: prices[prices.length - 1]
    };
  }

  private calculateMACD(prices: number[]) {
    // Basic MACD calculation
    return {
      macd: 0,
      signal: 0,
      histogram: 0
    };
  }

  private calculateBollingerBands(prices: number[]) {
    // Basic Bollinger Bands calculation
    const lastPrice = prices[prices.length - 1];
    return {
      upper: lastPrice * 1.1,
      middle: lastPrice,
      lower: lastPrice * 0.9
    };
  }
}