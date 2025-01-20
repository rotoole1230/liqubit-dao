// src/data/market.ts
import { MarketData, TokenMetadata, MarketMetrics, SocialMetrics, OnChainMetrics } from './providers/base-provider';

export interface MarketAnalysis {
  token: string;
  timestamp: string;
  timeframe: string;
  metrics: MarketMetrics;
  social: SocialMetrics;
  onChain: OnChainMetrics;
  token_info: TokenMetadata;
}

export interface MarketComparison {
  tokens: {
    [key: string]: MarketAnalysis;
  };
  timestamp: string;
  timeframe: string;
}

export class MarketService {
  private readonly API_ENDPOINT = '/api/market';

  public async getTokenAnalysis(token: string, timeframe: string = '24h'): Promise<MarketAnalysis> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/analyze/${token}?timeframe=${timeframe}`);

      if (!response.ok) {
        throw new Error(`Market analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data as MarketAnalysis;
    } catch (error) {
      console.error('Error fetching market analysis:', error);
      throw error;
    }
  }

  public async compareTokens(tokens: string[], timeframe: string = '24h'): Promise<MarketComparison> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokens, timeframe }),
      });

      if (!response.ok) {
        throw new Error(`Token comparison failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data as MarketComparison;
    } catch (error) {
      console.error('Error comparing tokens:', error);
      throw error;
    }
  }

  public async getMarketOverview(): Promise<{
    global_market_cap: number;
    total_volume_24h: number;
    btc_dominance: number;
    trending_tokens: string[];
    timestamp: string;
  }> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/overview`);

      if (!response.ok) {
        throw new Error(`Market overview failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching market overview:', error);
      throw error;
    }
  }

  public async searchToken(query: string): Promise<TokenMetadata[]> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error(`Token search failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching tokens:', error);
      throw error;
    }
  }

  public formatMarketCap(marketCap: number): string {
    if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    } else if (marketCap >= 1e3) {
      return `$${(marketCap / 1e3).toFixed(2)}K`;
    }
    return `$${marketCap.toFixed(2)}`;
  }

  public formatPrice(price: number): string {
    if (price < 0.01) {
      return price.toExponential(4);
    }
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })}`;
  }

  public formatChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }
}