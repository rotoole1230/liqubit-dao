// src/ai/enhanced-conversation.ts
import { MarketDataAggregator, ComprehensiveAnalysis } from '../data/market-data-aggregator';
import _ from 'lodash';

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
    entities?: string[]; // Mentioned tokens, metrics, or concepts
    intent?: string; // User's identified intent
  }>;
}

export class EnhancedLLM {
  private dataAggregator: MarketDataAggregator;
  private memory: ConversationMemory;
  private groqApiKey: string;
  private baseUrl: string;

  constructor() {
    this.dataAggregator = new MarketDataAggregator();
    this.groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
    this.baseUrl = 'https://api.groq.com/v1/chat/completions';
    this.memory = {
      recentTokens: [],
      conversationHistory: []
    };

    if (!this.groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured in environment variables');
    }
  }

  private async processWithGroq(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama2-70b-4096',
          messages: [
            {
              role: 'system',
              content: 'You are LIQUBIT, an advanced crypto market analyst AI. Provide detailed, data-driven analysis.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
          stream: false
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
      if (error instanceof Error) {
        throw new Error(`AI Processing Error: ${error.message}`);
      }
      throw new Error('Unknown error occurred during AI processing');
    }
  }

  public async chat(query: string): Promise<string> {
    try {
      // Add user message to memory
      this.memory.conversationHistory.push({
        role: 'user',
        content: query,
        timestamp: Date.now()
      });

      // Process with AI
      const response = await this.processWithGroq(query);

      // Add AI response to memory
      this.memory.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }

  public clearMemory(): void {
    this.memory = {
      recentTokens: [],
      conversationHistory: []
    };
  }
}