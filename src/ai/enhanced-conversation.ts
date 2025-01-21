import { MarketDataAggregator, ComprehensiveAnalysis } from '../data/market-data-aggregator';
import _ from 'lodash';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ConversationMemory {
  recentTokens: string[];
  marketContext?: ComprehensiveAnalysis;
  userPreferences?: {
    favoriteTokens: string[];
    analysisDepth: 'basic' | 'detailed' | 'expert';
    riskTolerance?: 'low' | 'medium' | 'high';
  };
  lastQuery?: string;
  lastAnalysis?: ComprehensiveAnalysis;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    entities?: string[];
    intent?: string;
  }>;
}

export class EnhancedLLM {
  private dataAggregator: MarketDataAggregator;
  private memory: ConversationMemory;
  private readonly config: {
    temperature: number;
    max_tokens: number;
    model: string;
  };

  constructor() {
    this.dataAggregator = new MarketDataAggregator();
    this.config = {
      temperature: 0.7,
      max_tokens: 1500,
      model: 'llama-3.3-70b-versatile'
    };

    this.memory = {
      recentTokens: [],
      conversationHistory: [],
      userPreferences: {
        analysisDepth: 'detailed',
        riskTolerance: 'medium',
        favoriteTokens: []
      }
    };

    if (!process.env.NEXT_PUBLIC_GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }
  }

  private async extractTokensFromQuery(query: string): Promise<string[]> {
    const commonTokens = ['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP', 'ADA', 'DOGE'];
    const tokens = new Set<string>();

    // Check for common tokens
    commonTokens.forEach(token => {
      if (query.toUpperCase().includes(token)) {
        tokens.add(token);
      }
    });

    // Basic regex for crypto symbols
    const symbolRegex = /\b[A-Z]{2,5}\b/g;
    const matches = query.match(symbolRegex) || [];
    matches.forEach(token => tokens.add(token));

    return Array.from(tokens);
  }

  private async fetchMarketContext(tokens: string[]): Promise<Record<string, ComprehensiveAnalysis>> {
    const context: Record<string, ComprehensiveAnalysis> = {};

    await Promise.all(
      tokens.map(async (token) => {
        try {
          context[token] = await this.dataAggregator.fetchTokenData(token);
        } catch (error) {
          console.error(`Error fetching data for ${token}:`, error);
        }
      })
    );

    return context;
  }

  private formatMarketContext(context: Record<string, ComprehensiveAnalysis>): string {
    return Object.values(context)
      .map(tokenData => this.dataAggregator.formatMarketContext(tokenData))
      .join('\n\n');
  }

  private buildSystemPrompt(context: Record<string, ComprehensiveAnalysis>): string {
    return `You are LIQUBIT, an advanced crypto market analysis AI assistant.

Your capabilities include:
- Detailed market analysis
- Technical indicator interpretation
- On-chain metrics analysis
- Social sentiment analysis
- Risk assessment

Current Market Context:
${this.formatMarketContext(context)}

Guidelines:
- Always reference the provided market data in your analysis
- Highlight significant metrics and trends
- Include confidence levels for predictions
- Be clear about limitations and uncertainties
- Format responses for terminal display
- When making comparisons, use specific data points
- Highlight any unusual patterns or anomalies
- Consider both technical and fundamental factors
`;
  }

  private async processWithGroq(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(({ role, content }) => ({ role, content })),
          temperature: this.config.temperature,
          max_tokens: this.config.max_tokens
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error in Groq processing:', error);
      throw error instanceof Error ? error : new Error('Unknown error in Groq processing');
    }
  }

  public async chat(query: string): Promise<string> {
    try {
      console.log('Processing query:', query);

      // Extract tokens from query
      const tokens = await this.extractTokensFromQuery(query);
      console.log('Extracted tokens:', tokens);

      // Fetch market data for tokens
      const marketContext = await this.fetchMarketContext(tokens);
      console.log('Fetched market context:', marketContext);

      // Build messages array with context
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(marketContext),
          timestamp: Date.now()
        },
        ...this.memory.conversationHistory.slice(-3).map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        {
          role: 'user',
          content: query,
          timestamp: Date.now()
        }
      ];

      // Process with LLM
      const response = await this.processWithGroq(messages);
      console.log('Got LLM response:', response);

      // Update conversation memory
      this.memory.conversationHistory.push(
        {
          role: 'user',
          content: query,
          timestamp: Date.now(),
          entities: tokens
        },
        {
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        }
      );

      // Keep memory manageable
      if (this.memory.conversationHistory.length > 10) {
        this.memory.conversationHistory = this.memory.conversationHistory.slice(-10);
      }

      // Update market context in memory
      this.memory.marketContext = Object.values(marketContext)[0];
      this.memory.lastQuery = query;
      this.memory.recentTokens = tokens;

      return response;
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }

  public updateUserPreferences(preferences: Partial<ConversationMemory['userPreferences']>): void {
    this.memory.userPreferences = {
      ...this.memory.userPreferences,
      ...preferences
    };
  }

  public clearMemory(): void {
    this.memory = {
      recentTokens: [],
      conversationHistory: [],
      userPreferences: this.memory.userPreferences
    };
  }
}