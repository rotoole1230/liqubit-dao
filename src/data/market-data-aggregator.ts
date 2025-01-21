import { CoinGeckoProvider } from './providers/coingecko-provider';
import {
  MarketData,
  OnChainMetrics,
  TechnicalIndicators,
  SocialMetrics
} from './providers/base-provider';
import { formatCurrency, formatPercentage } from './providers/utils';

export interface ComprehensiveAnalysis {
  symbol: string;
  market: MarketData;
  onChain: OnChainMetrics;
  technical: TechnicalIndicators;
  social: SocialMetrics;
  timestamp: Date;
  status: 'success' | 'partial' | 'error';
  errors?: string[];
}

export class MarketDataAggregator {
  private providers: {
    coingecko: CoinGeckoProvider;
  };
  private readonly retryAttempts = 3;
  private readonly retryDelay = 1000;

  constructor() {
    this.providers = {
      coingecko: new CoinGeckoProvider()
    };
  }

  async fetchTokenData(symbol: string): Promise<ComprehensiveAnalysis> {
    const errors: string[] = [];
    const timestamp = new Date();
    let status: 'success' | 'partial' | 'error' = 'success';

    // Initialize with default values
    let analysis: ComprehensiveAnalysis = this.createDefaultAnalysis(symbol);

    try {
      // Fetch data with retries and parallel execution
      const [marketResult, technicalResult, socialResult] = await Promise.allSettled([
        this.fetchWithRetry(() => this.providers.coingecko.getMarketData(symbol)),
        this.fetchWithRetry(() => this.providers.coingecko.getTechnicalIndicators(symbol)),
        this.fetchWithRetry(() => this.providers.coingecko.getSocialMetrics(symbol))
      ]);

      // Process market data
      if (marketResult.status === 'fulfilled') {
        analysis.market = marketResult.value;
      } else {
        errors.push(`Market data error: ${marketResult.reason}`);
        status = 'partial';
      }

      // Process technical indicators
      if (technicalResult.status === 'fulfilled') {
        analysis.technical = technicalResult.value;
      } else {
        errors.push(`Technical data error: ${technicalResult.reason}`);
        status = 'partial';
      }

      // Process social metrics
      if (socialResult.status === 'fulfilled') {
        analysis.social = socialResult.value;
      } else {
        errors.push(`Social data error: ${socialResult.reason}`);
        status = 'partial';
      }

      // On-chain metrics are currently placeholders
      analysis.onChain = this.providers.coingecko.getOnChainMetrics(symbol);

      // Update status and metadata
      analysis.timestamp = timestamp;
      analysis.status = errors.length === 0 ? 'success' : 'partial';
      if (errors.length > 0) {
        analysis.errors = errors;
      }

      return analysis;

    } catch (error) {
      console.error(`Critical error fetching data for ${symbol}:`, error);
      return {
        ...this.createDefaultAnalysis(symbol),
        status: 'error',
        errors: [`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`],
        timestamp
      };
    }
  }

  private async fetchWithRetry<T>(
    operation: () => Promise<T>,
    attempts: number = this.retryAttempts
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < attempts - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)));
        }
      }
    }

    throw lastError;
  }

  private createDefaultAnalysis(symbol: string): ComprehensiveAnalysis {
    const timestamp = new Date();
    return {
      symbol: symbol.toUpperCase(),
      market: {
        symbol: symbol.toUpperCase(),
        price: 0,
        priceChange24h: 0,
        priceChangePercentage24h: 0,
        volume24h: 0,
        marketCap: 0,
        high24h: 0,
        low24h: 0,
        circulatingSupply: 0,
        totalSupply: 0,
        lastUpdated: timestamp
      },
      onChain: {
        symbol: symbol.toUpperCase(),
        activeAddresses24h: 0,
        transactionCount24h: 0,
        averageTransactionValue: 0,
        largeTransactions24h: 0,
        netFlow24h: 0,
        totalValueLocked: 0,
        dailyActiveContracts: 0,
        gasUsed24h: 0,
        timestamp: timestamp
      },
      technical: {
        symbol: symbol.toUpperCase(),
        rsi14: 0,
        macd: { value: 0, signal: 0, histogram: 0 },
        ema: { ema9: 0, ema20: 0, ema50: 0, ema200: 0 },
        bollingerBands: { upper: 0, middle: 0, lower: 0 },
        volume: { obv: 0, vwap: 0 },
        timestamp: timestamp
      },
      social: {
        symbol: symbol.toUpperCase(),
        twitterMentions24h: 0,
        sentimentScore24h: 0,
        telegramActiveUsers: 0,
        redditSubscribers: 0,
        githubCommits24h: 0,
        developerActivity: 0,
        timestamp: timestamp
      },
      timestamp: timestamp,
      status: 'success'
    };
  }

  formatMarketContext(data: ComprehensiveAnalysis): string {
    const status = data.status === 'success' ? '✅' :
                  data.status === 'partial' ? '⚠️' : '❌';

    const marketData = `
Market Analysis for ${data.symbol} ${status}

Price Information:
- Current Price: ${formatCurrency(data.market.price)}
- 24h Change: ${formatPercentage(data.market.priceChangePercentage24h)}
- 24h Volume: ${formatCurrency(data.market.volume24h, 0)}
- Market Cap: ${formatCurrency(data.market.marketCap, 0)}
${data.market.high24h ? `- 24h High: ${formatCurrency(data.market.high24h)}` : ''}
${data.market.low24h ? `- 24h Low: ${formatCurrency(data.market.low24h)}` : ''}`;

    const technicalData = `
Technical Indicators:
- RSI (14): ${data.technical.rsi14.toFixed(2)}
- MACD: ${data.technical.macd.value.toFixed(4)}
- EMA Status: ${data.technical.ema.ema50 > data.technical.ema.ema200 ? 'Bullish' : 'Bearish'}`;

    const socialData = `
Social Metrics:
- Twitter Followers: ${data.social.twitterMentions24h.toLocaleString()}
- Reddit Subscribers: ${data.social.redditSubscribers.toLocaleString()}
- Developer Activity: ${data.social.developerActivity || 'N/A'}`;

    const metadata = `
Last Updated: ${data.timestamp.toLocaleString()}
${data.errors ? '\nWarnings:\n' + data.errors.map(error => `- ${error}`).join('\n') : ''}`;

    return `${marketData}${technicalData}${socialData}${metadata}`;
  }
}