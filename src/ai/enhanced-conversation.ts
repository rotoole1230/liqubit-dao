// src/ai/enhanced-conversation.ts

import { MarketDataAggregator, ComprehensiveAnalysis } from '../data/market-data-aggregator';
import _ from 'lodash';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  entities?: string[];
  intent?: string;
}

interface ConversationMemory {
  recentTokens: string[];
  marketContext?: any;
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

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
}

interface LLMConfig {
  temperature: number;
  max_tokens: number;
  model: string;
  stream: boolean;
}

export class EnhancedLLM {
  private dataAggregator: MarketDataAggregator;
  private memory: ConversationMemory;
  private readonly config: LLMConfig;
  private readonly systemPrompt: string;

  constructor() {
    this.dataAggregator = new MarketDataAggregator();
    this.config = {
      temperature: 0.7,
      max_tokens: 1500,
      model: 'llama-3.3-70b-versatile',
      stream: false
    };

    this.systemPrompt = `You are LIQUBIT, an advanced crypto market analysis AI assistant.
Your capabilities include:
- Detailed market analysis
- Technical indicator interpretation
- On-chain metrics analysis
- Social sentiment analysis
- Risk assessment

Guidelines:
- Always provide data-driven insights
- Highlight key metrics and trends
- Include confidence levels for predictions
- Be clear about limitations and uncertainties
- Format responses for terminal display
`;

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

  private async fetchMarketContext(query: string): Promise<any> {
    try {
      // Extract relevant tokens/symbols from query
      const tokens = await this.extractTokensFromQuery(query);
      if (tokens.length === 0) return null;

      // Fetch market data for identified tokens
      const marketData = await Promise.all(
        tokens.map(token => this.dataAggregator.fetchTokenData(token))
      );

      return {
        tokens,
        marketData,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching market context:', error);
      return null;
    }
  }

  private async extractTokensFromQuery(query: string): Promise<string[]> {
    // Basic regex for crypto symbols (can be enhanced)
    const symbolRegex = /\b[A-Z]{2,5}\b/g;
    return Array.from(new Set(query.match(symbolRegex) || []));
  }

  private buildMessages(query: string, context?: any): ChatMessage[] {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: this.systemPrompt,
        timestamp: Date.now()
      }
    ];

    // Add context from recent conversation
    const recentMessages = this.memory.conversationHistory
      .slice(-3)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));

    messages.push(...recentMessages);

    // Add market context if available
    if (context) {
      messages.push({
        role: 'system',
        content: `Market Context:\n${JSON.stringify(context, null, 2)}`,
        timestamp: Date.now()
      });
    }

    // Add current query
    messages.push({
      role: 'user',
      content: query,
      timestamp: Date.now()
    });

    return messages;
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
          max_tokens: this.config.max_tokens,
          stream: this.config.stream
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
      }

      const data: GroqResponse = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error in Groq processing:', error);
      throw error instanceof Error ? error : new Error('Unknown error in Groq processing');
    }
  }

  public async chat(query: string): Promise<string> {
    try {
      // Fetch relevant market context
      const context = await this.fetchMarketContext(query);

      // Build message array with context
      const messages = this.buildMessages(query, context);

      // Process with LLM
      const response = await this.processWithGroq(messages);

      // Update conversation memory
      this.memory.conversationHistory.push(
        {
          role: 'user',
          content: query,
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: response,
          timestamp: Date.now()
        }
      );

      // Keep memory size manageable
      if (this.memory.conversationHistory.length > 10) {
        this.memory.conversationHistory = this.memory.conversationHistory.slice(-10);
      }

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