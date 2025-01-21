import { CacheManager } from './cache/cache-manager';
import { fetchWithRetry, RateLimiter } from './utils/provider-utils';
import { CoinGeckoProvider } from './providers/coingecko-provider';
import { CookieFunProvider } from './providers/cookiefun-provider';
import { 
  MarketData, 
  OnChainMetrics, 
  TechnicalIndicators, 
  SocialMetrics 
} from './providers/base-provider';

export interface AggregatorConfig {
  cacheTTL: number;
  maxCacheSize: number;
  rateLimit: number;
  providers: {
    coingecko?: boolean;
    cookiefun?: boolean;
    // Add more providers as needed
  };
}

export class EnhancedMarketDataAggregator {
  private providers: Map<string, any> = new Map();
  private cache: CacheManager<any>;
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor(private config: AggregatorConfig) {
    // Initialize cache
    this.cache = new CacheManager({
      ttl: config.cacheTTL,
      maxSize: config.maxCacheSize
    });

    // Initialize providers
    if (config.providers.coingecko) {
      this.providers.set('coingecko', new CoinGeckoProvider());
      this.rateLimiters.set('coingecko', new RateLimiter(config.rateLimit));
    }

    if (config.providers.cookiefun) {
      this.providers.set('cookiefun', new CookieFunProvider());
      this.rateLimiters.set('cookiefun', new RateLimiter(config.rateLimit));
    }
  }

  private async fetchFromProvider<T>(
    provider: string,
    method: string,
    symbol: string
  ): Promise<T | null> {
    const rateLimiter = this.rateLimiters.get(provider);
    if (rateLimiter) await rateLimiter.acquire();

    const providerInstance = this.providers.get(provider);
    if (!providerInstance) return null;

    try {
      return await fetchWithRetry(
        () => providerInstance[method](symbol),
        { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 },
        provider
      );
    } catch (error) {
      console.error(`Error fetching from ${provider}:`, error);
      return null;
    }
  }

  private async aggregateData<T>(
    symbol: string,
    method: string,
    mergeStrategy: (results: (T | null)[]) => T
  ): Promise<T> {
    const cacheKey = `${symbol}-${method}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) return cachedData;

    const providerPromises = Array.from(this.providers.keys()).map(provider =>
      this.fetchFromProvider<T>(provider, method, symbol)
    );

    const results = await Promise.all(providerPromises);
    const mergedData = mergeStrategy(results);

    this.cache.set(cacheKey, mergedData);
    return mergedData;
  }

  async getComprehensiveAnalysis(symbol: string) {
    const [market, onChain, technical, social] = await Promise.all([
      this.getMarketData(symbol),
      this.getOnChainMetrics(symbol),
      this.getTechnicalIndicators(symbol),
      this.getSocialMetrics(symbol)
    ]);

    return {
      symbol: symbol.toUpperCase(),
      market,
      onChain,
      technical,
      social,
      timestamp: new Date(),
      providers: Array.from(this.providers.keys())
    };
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    return this.aggregateData<MarketData>(
      symbol,
      'getMarketData',
      this.mergeMarketData.bind(this)
    );
  }

  async getOnChainMetrics(symbol: string): Promise<OnChainMetrics> {
    return this.aggregateData<OnChainMetrics>(
      symbol,
      'getOnChainMetrics',
      this.mergeOnChainMetrics.bind(this)
    );
  }

  async getTechnicalIndicators(symbol: string): Promise<TechnicalIndicators> {
    return this.aggregateData<TechnicalIndicators>(
      symbol,
      'getTechnicalIndicators',
      this.mergeTechnicalIndicators.bind(this)
    );
  }

  async getSocialMetrics(symbol: string): Promise<SocialMetrics> {
    return this.aggregateData<SocialMetrics>(
      symbol,
      'getSocialMetrics',
      this.mergeSocialMetrics.bind(this)
    );
  }

  // Merge strategies for different data types
  private mergeMarketData(results: (MarketData | null)[]): MarketData {
    // Implement weighted average based on provider reliability
    // ... implementation details
  }

  private mergeOnChainMetrics(results: (OnChainMetrics | null)[]): OnChainMetrics {
    // Merge on-chain metrics with priority to specialized providers
    // ... implementation details
  }

  private mergeTechnicalIndicators(results: (TechnicalIndicators | null)[]): TechnicalIndicators {
    // Merge technical indicators with validation
    // ... implementation details
  }

  private mergeSocialMetrics(results: (SocialMetrics | null)[]): SocialMetrics {
    // Merge social metrics with cross-validation
    // ... implementation details
  }
}`