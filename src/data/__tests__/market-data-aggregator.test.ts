import { EnhancedMarketDataAggregator } from '../enhanced-market-data-aggregator';
import { CacheManager } from '../cache/cache-manager';

describe('EnhancedMarketDataAggregator', () => {
  let aggregator: EnhancedMarketDataAggregator;

  beforeEach(() => {
    // Initialize with test configuration
    aggregator = new EnhancedMarketDataAggregator({
      cacheTTL: 60000,
      maxCacheSize: 100,
      rateLimit: 1000,
      providers: {
        coingecko: true,
        cookiefun: true
      }
    });
  });

  describe('Market Data Fetching', () => {
    it('should fetch market data successfully', async () => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          bitcoin: {
            usd: 50000,
            usd_market_cap: 1000000000000,
            usd_24h_vol: 30000000000,
            usd_24h_change: 5.5
          }
        })
      });

      const result = await aggregator.getMarketData('bitcoin');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('BITCOIN');
      expect(result.price).toBe(50000);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      await expect(aggregator.getMarketData('bitcoin')).rejects.toThrow();
    });

    it('should use cached data when available', async () => {
      // First call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          bitcoin: {
            usd: 50000,
            usd_market_cap: 1000000000000,
            usd_24h_vol: 30000000000
          }
        })
      });

      await aggregator.getMarketData('bitcoin');
      const result = await aggregator.getMarketData('bitcoin');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.price).toBe(50000);
    });
  });

  describe('Comprehensive Analysis', () => {
    it('should fetch comprehensive analysis successfully', async () => {
      const analysis = await aggregator.getComprehensiveAnalysis('bitcoin');

      expect(analysis).toBeDefined();
      expect(analysis.symbol).toBe('BITCOIN');
      expect(analysis.market).toBeDefined();
      expect(analysis.onChain).toBeDefined();
      expect(analysis.technical).toBeDefined();
      expect(analysis.social).toBeDefined();
      expect(analysis.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Technical Indicators', () => {
    it('should calculate technical indicators correctly', async () => {
      const result = await aggregator.getTechnicalIndicators('bitcoin');

      expect(result).toBeDefined();
      expect(result.rsi14).toBeDefined();
      expect(result.macd).toBeDefined();
      expect(result.ema).toBeDefined();
    });
  });

  describe('Social Metrics', () => {
    it('should fetch social metrics successfully', async () => {
      const result = await aggregator.getSocialMetrics('bitcoin');

      expect(result).toBeDefined();
      expect(result.twitterMentions24h).toBeDefined();
      expect(result.sentimentScore24h).toBeDefined();
    });
  });
});