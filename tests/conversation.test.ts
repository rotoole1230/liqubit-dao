// tests/ai/conversation.test.ts
import { ConversationalLLM } from '../../src/ai/conversation';
import { MarketDataAggregator } from '../../src/data/market-data-aggregator';

// Mock the market data aggregator
jest.mock('../../src/data/market-data-aggregator');

describe('ConversationalLLM', () => {
  let llm: ConversationalLLM;
  let mockMarketData: jest.Mocked<MarketDataAggregator>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock market data
    mockMarketData = {
      getComprehensiveAnalysis: jest.fn().mockResolvedValue({
        token: 'BTC',
        metrics: {
          price: 50000,
          volume24h: 1000000,
          change24h: 5.5
        }
      }),
      getMarketTrends: jest.fn().mockResolvedValue({
        trending: ['BTC', 'ETH'],
        volume: ['SOL', 'AVAX'],
        sentiment: ['BNB', 'ADA']
      })
    } as any;

    llm = new ConversationalLLM(mockMarketData);
  });

  describe('Basic Conversation', () => {
    test('should handle simple queries', async () => {
      const response = await llm.chat('Hello');
      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
    });

    test('should maintain conversation context', async () => {
      await llm.chat('What is Bitcoin?');
      const response = await llm.chat('What was its price again?');
      expect(response).toBeTruthy();
      expect(response.toLowerCase()).toContain('bitcoin');
    });
  });

  describe('Market Analysis', () => {
    test('should fetch and analyze token data', async () => {
      const response = await llm.chat('Analyze BTC');
      expect(mockMarketData.getComprehensiveAnalysis).toHaveBeenCalledWith('BTC');
      expect(response).toContain('BTC');
      expect(response).toContain('50000'); // Price from mock data
    });

    test('should handle market trends queries', async () => {
      const response = await llm.chat('What are the trending tokens?');
      expect(mockMarketData.getMarketTrends).toHaveBeenCalled();
      expect(response).toContain('BTC');
      expect(response).toContain('ETH');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid tokens', async () => {
      mockMarketData.getComprehensiveAnalysis.mockRejectedValueOnce(
        new Error('Invalid token')
      );
      const response = await llm.chat('Analyze INVALID_TOKEN');
      expect(response).toContain('invalid');
      expect(response).toContain('token');
    });

    test('should handle API timeouts', async () => {
      mockMarketData.getComprehensiveAnalysis.mockRejectedValueOnce(
        new Error('Request timeout')
      );
      const response = await llm.chat('Analyze BTC');
      expect(response).toContain('timeout');
      expect(response).toContain('try again');
    });
  });
});

// tests/ai/pipeline.test.ts
import { LiqubitPipeline } from '../../src/liqubit-ai-pipeline';

describe('LiqubitPipeline', () => {
  let pipeline: LiqubitPipeline;

  beforeEach(() => {
    pipeline = new LiqubitPipeline({
      apiKeys: {
        groq: 'test-key',
        coingecko: 'test-key',
        cookieFun: 'test-key'
      },
      cache: {
        ttl: 300000 // 5 minutes
      }
    });
  });

  test('should process market analysis queries', async () => {
    const response = await pipeline.processQuery('Analyze BTC market conditions');
    expect(response).toBeTruthy();
    expect(typeof response).toBe('string');
  });

  test('should handle complex multi-token analysis', async () => {
    const response = await pipeline.processQuery('Compare BTC and ETH performance');
    expect(response).toContain('BTC');
    expect(response).toContain('ETH');
  });

  test('should respect rate limits', async () => {
    const promises = Array(10).fill(null).map(() => 
      pipeline.processQuery('Quick market check')
    );
    const responses = await Promise.all(promises);
    expect(responses).toHaveLength(10);
    responses.forEach(response => {
      expect(response).toBeTruthy();
    });
  });
});