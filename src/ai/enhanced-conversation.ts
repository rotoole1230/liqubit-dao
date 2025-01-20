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

interface AnalysisIntent {
  type: 
    | 'market_analysis' 
    | 'price_check' 
    | 'comparison' 
    | 'trend_analysis'
    | 'technical_analysis'
    | 'sentiment_analysis'
    | 'risk_assessment'
    | 'general_info';
  tokens: string[];
  timeframe?: string;
  metrics?: string[];
}

export class EnhancedLLM {
  private dataAggregator: MarketDataAggregator;
  private memory: ConversationMemory;
  private groqApiKey: string;

  constructor() {
    this.dataAggregator = new MarketDataAggregator();
    this.groqApiKey = process.env.GROQ_API_KEY || '';
    this.memory = {
      recentTokens: [],
      conversationHistory: []
    };
  }

  private async identifyIntent(query: string): Promise<AnalysisIntent> {
    // Use LLM to identify user's intent
    const prompt = `
    Analyze the following user query and identify the primary intent and relevant tokens.
    Query: "${query}"

    Respond in JSON format:
    {
      "type": "market_analysis|price_check|comparison|trend_analysis|technical_analysis|sentiment_analysis|risk_assessment|general_info",
      "tokens": ["token symbols"],
      "timeframe": "mentioned timeframe or null",
      "metrics": ["mentioned metrics"]
    }
    `;

    try {
      const response = await this.processWithGroq(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error identifying intent:', error);
      // Fallback to basic intent detection
      return {
        type: 'general_info',
        tokens: this.extractTokens(query)
      };
    }
  }

  private extractTokens(query: string): string[] {
    // Enhanced token extraction with common variations
    const commonTokens = {
      'BITCOIN': 'BTC',
      'ETHEREUM': 'ETH',
      'SOLANA': 'SOL',
      'LIQUBIT': 'LIQ'
      // Add more token mappings
    };

    const tokens = new Set<string>();

    // Check for exact matches and variations
    Object.entries(commonTokens).forEach(([name, symbol]) => {
      if (query.toUpperCase().includes(name) || query.toUpperCase().includes(symbol)) {
        tokens.add(symbol);
      }
    });

    return Array.from(tokens);
  }

  private async buildContextualPrompt(query: string, intent: AnalysisIntent, analysisData?: ComprehensiveAnalysis[]): Promise<string> {
    const recentContext = this.memory.conversationHistory
      .slice(-3)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    let marketContext = '';
    if (analysisData && analysisData.length > 0) {
      marketContext = analysisData.map(data => `
Token: ${data.token}
Price: $${data.metrics.price}
24h Change: ${data.metrics.change24h}%
Market Cap: $${data.metrics.marketCap}
Volume: $${data.metrics.volume24h}
Social Sentiment: ${data.social.sentimentScore}
On-chain Activity: ${data.onChain.transactions24h} transactions
      `).join('\n');
    }

    return `You are LIQUBIT, an advanced AI crypto market analyst. Use the following context to provide detailed, data-driven analysis.

Recent Conversation:
${recentContext}

Market Context:
${marketContext}

Global Market Context:
- Global Market Cap: $${analysisData?.[0]?.marketContext.globalMarketCap || 'N/A'}
- BTC Dominance: ${analysisData?.[0]?.marketContext.btcDominance || 'N/A'}%
- Fear & Greed Index: ${analysisData?.[0]?.marketContext.fear_greed_index || 'N/A'}

User Query: ${query}
Identified Intent: ${intent.type}
Relevant Tokens: ${intent.tokens.join(', ')}

Provide a comprehensive analysis that:
1. Addresses the user's specific intent
2. Incorporates relevant market data
3. Highlights key insights and patterns
4. Suggests potential opportunities or risks
5. Maintains a conversational yet professional tone

Format your response to be easily readable with clear sections and data points.`;
  }

  private async processWithGroq(prompt: string): Promise<string> {
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
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error processing with Groq:', error);
      throw error;
    }
  }

  public async chat(query: string): Promise<string> {
    try {
      // Identify intent and tokens
      const intent = await this.identifyIntent(query);

      // Fetch comprehensive analysis for all mentioned tokens
      const analysisPromises = intent.tokens.map(token => 
        this.dataAggregator.getComprehensiveAnalysis(token)
      );
      const analysisData = await Promise.all(analysisPromises);

      // Build contextual prompt
      const prompt = await this.buildContextualPrompt(query, intent, analysisData);

      // Get LLM response
      const response = await this.processWithGroq(prompt);

      // Update conversation memory
      this.memory.conversationHistory.push({
        role: 'user',
        content: query,
        timestamp: Date.now(),
        entities: intent.tokens,
        intent: intent.type
      });

      this.memory.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });

      // Update recent tokens
      this.memory.recentTokens = _.uniq([...this.memory.recentTokens, ...intent.tokens])
        .slice(-5); // Keep last 5 tokens

      // Store last analysis
      if (analysisData.length > 0) {
        this.memory.lastAnalysis = analysisData[0];
      }

      return response;
    } catch (error) {
      console.error('Error in enhanced chat:', error);
      throw error;
    }
  }

  public clearMemory(): void {
    this.memory = {
      recentTokens: [],
      conversationHistory: []
    };
    this.dataAggregator.clearCache();
  }
}