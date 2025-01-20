// src/ai/pipeline.ts
import { MarketService } from '../data/market-service';
import { MarketData } from '../data/providers/base-provider';

export interface AnalysisRequest {
  query: string;
  token?: string;
  timeframe?: string;
}

export interface AnalysisResponse {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  insights: string[];
  metrics: MarketData;
  timestamp: number;
}

export class LLMPipeline {
  private marketService: MarketService;
  private groqApiKey: string;

  constructor() {
    this.marketService = new MarketService();
    this.groqApiKey = process.env.GROQ_API_KEY || '';
  }

  private async generatePrompt(request: AnalysisRequest, marketData: MarketData): Promise<string> {
    const { query, token, timeframe } = request;

    return `
You are LIQUBIT, an advanced crypto market analysis AI. Analyze the following market data and provide insights.

Market Data for ${token}:
- Current Price: $${marketData.price}
- 24h Volume: $${marketData.volume}
- Market Cap: $${marketData.marketCap}
- 24h Change: ${marketData.change24h}%
- Timeframe: ${timeframe || '24h'}

User Query: ${query}

Provide a comprehensive analysis including:
1. Market Summary
2. Market Sentiment (bullish/bearish/neutral)
3. Key Insights
4. Confidence Level (0-100)

Format your response as a JSON object with the following structure:
{
  "summary": "Brief but detailed market analysis",
  "sentiment": "bullish/bearish/neutral",
  "confidence": number,
  "insights": [
    "Key insight 1",
    "Key insight 2",
    ...
  ]
}`;
  }

  private async processWithGroq(prompt: string): Promise<any> {
    try {
      const response = await fetch('https://api.groq.com/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3-3-70b',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error processing with Groq:', error);
      throw error;
    }
  }

  public async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      if (!request.token) {
        throw new Error('Token is required for analysis');
      }

      // 1. Fetch market data
      const marketData = await this.marketService.getMarketData(request.token);

      // 2. Generate prompt
      const prompt = await this.generatePrompt(request, marketData);

      // 3. Process with LLM
      const llmResponse = await this.processWithGroq(prompt);

      // 4. Format and return response
      return {
        ...llmResponse,
        metrics: marketData,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error in analysis pipeline:', error);
      throw error;
    }
  }
}

// src/ai/cache.ts
interface CacheEntry {
  data: AnalysisResponse;
  timestamp: number;
}

export class AnalysisCache {
  private cache: Map<string, CacheEntry>;
  private readonly TTL: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cache = new Map();
  }

  set(key: string, data: AnalysisResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): AnalysisResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Create and export singleton instances
export const llmPipeline = new LLMPipeline();
export const analysisCache = new AnalysisCache();