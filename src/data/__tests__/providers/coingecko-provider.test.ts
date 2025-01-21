import { CoinGeckoProvider } from '../../providers/coingecko-provider';

describe('CoinGecko Provider', () => {
  let provider: CoinGeckoProvider;

  beforeEach(() => {
    provider = new CoinGeckoProvider();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Market Data', () => {
    it('should fetch market data successfully', async () => {
      const mockResponse = {
        bitcoin: {
          usd: 50000,
          usd_market_cap: 1000000000000,
          usd_24h_vol: 30000000000,
          usd_24h_change: 5.5,
          last_updated_at: Date.now() / 1000
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await provider.getMarketData('bitcoin');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('BITCOIN');
      expect(result.price).toBe(50000);
      expect(result.marketCap).toBe(1000000000000);
      expect(result.volume24h).toBe(30000000000);
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Rate limit exceeded'
      });

      await expect(provider.getMarketData('bitcoin')).rejects.toThrow();
    });
  });

  describe('Technical Indicators', () => {
    const mockOHLCVData = [
      [1625097600000, 35000, 36000, 34000, 35500, 1000000], // [timestamp, open, high, low, close, volume]
      [1625184000000, 35500, 37000, 35000, 36800, 1200000],
      [1625270400000, 36800, 38000, 36500, 37500, 1500000]
    ];

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOHLCVData)
      });
    });

    it('should calculate RSI correctly', async () => {
      const result = await provider.getTechnicalIndicators('bitcoin');
      expect(result.rsi14).toBeDefined();
      expect(result.rsi14).toBeGreaterThanOrEqual(0);
      expect(result.rsi14).toBeLessThanOrEqual(100);
    });

    it('should calculate MACD correctly', async () => {
      const result = await provider.getTechnicalIndicators('bitcoin');
      expect(result.macd).toBeDefined();
      expect(result.macd.value).toBeDefined();
      expect(result.macd.signal).toBeDefined();
      expect(result.macd.histogram).toBeDefined();
    });

    it('should calculate EMAs correctly', async () => {
      const result = await provider.getTechnicalIndicators('bitcoin');
      expect(result.ema).toBeDefined();
      expect(result.ema.ema9).toBeDefined();
      expect(result.ema.ema20).toBeDefined();
      expect(result.ema.ema50).toBeDefined();
      expect(result.ema.ema200).toBeDefined();
    });
  });

  describe('Social Metrics', () => {
    it('should fetch social metrics successfully', async () => {
      const mockResponse = {
        community_data: {
          twitter_followers: 100000,
          telegram_channel_user_count: 50000,
          reddit_subscribers: 75000
        },
        developer_data: {
          commits_24h: 50,
          stars: 1000
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await provider.getSocialMetrics('bitcoin');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('BITCOIN');
      expect(result.twitterMentions24h).toBe(100000);
      expect(result.telegramActiveUsers).toBe(50000);
      expect(result.redditSubscribers).toBe(75000);
      expect(result.githubCommits24h).toBe(50);
    });
  });
});