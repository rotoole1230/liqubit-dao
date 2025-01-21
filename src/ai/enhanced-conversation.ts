import { MarketDataAggregator, ComprehensiveAnalysis } from '../data/market-data-aggregator';
import { TOKEN_MAPPINGS } from '../data/providers/token-mapper';
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
    // Validate required API keys
    if (!process.env.NEXT_PUBLIC_GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }
    if (!process.env.NEXT_PUBLIC_COINGECKO_API_KEY) {
      throw new Error('COINGECKO_API_KEY not configured');
    }

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
  }

  private extractTokensFromQuery(query: string): string[] {
    const tokens = new Set<string>();
    const upperQuery = query.toUpperCase();

    // Check for direct token mentions
    for (const [symbol, id] of Object.entries(TOKEN_MAPPINGS)) {
      if (upperQuery.includes(symbol) || upperQuery.includes(id.toUpperCase())) {
        tokens.add(id);
      }
    }

    // Handle general market queries
    if (tokens.size === 0 && 
        (query.toLowerCase().includes('market') || 
         query.toLowerCase().includes('price') ||
         query.toLowerCase().includes('analysis'))) {
      tokens.add('bitcoin'); // Default to bitcoin for general market queries
    }

    // Extract potential new symbols using regex
    const symbolRegex = /\b[A-Z]{2,5}\b/g;
    const matches = query.match(symbolRegex) || [];

    for (const match of matches) {
      // Check if it's a known token
      const mappedToken = TOKEN_MAPPINGS[match] || match.toLowerCase();
      if (!Array.from(tokens).includes(mappedToken)) {
        tokens.add(mappedToken);
      }
    }

    console.log('Extracted tokens:', Array.from(tokens));
    return Array.from(tokens);
  }

  private async fetchMarketContext(tokens: string[]): Promise<Record<string, ComprehensiveAnalysis>> {
    const context: Record<string, ComprehensiveAnalysis> = {};
    const errors: string[] = [];

    console.log('Fetching market data for tokens:', tokens);

    await Promise.all(tokens.map(async (token) => {
      try {
        const analysis = await this.dataAggregator.fetchTokenData(token);
        context[token] = analysis;

        if (analysis.status !== 'success') {
          errors.push(`Warning for ${token}: ${analysis.errors?.join(', ')}`);
        }

        console.log(`Successfully fetched data for ${token} (Status: ${analysis.status})`);
      } catch (error) {
        console.error(`Error fetching data for ${token}:`, error);
        errors.push(`Failed to fetch data for ${token}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }));

    if (errors.length > 0) {
      console.warn('Data fetching warnings:', errors);
    }

    return context;
  }

  private formatMarketContext(context: Record<string, ComprehensiveAnalysis>): string {
    return Object.values(context)
      .map(tokenData => this.dataAggregator.formatMarketContext(tokenData))
      .join('\n\n');
  }

  private buildSystemPrompt(context: Record<string, ComprehensiveAnalysis>): string {
    const hasPartialData = Object.values(context).some(data => data.status !== 'success');
    const dataQualityNote = hasPartialData ? 
      '\nNote: Some market data may be partial or incomplete. Analysis will be based on available data.' : '';

    return `You are LIQUBIT, an advanced crypto market analysis AI assistant powered by real-time market data.${dataQualityNote}

Current Capabilities:
- Real-time market data analysis
- Technical indicator interpretation
- On-chain metrics analysis
- Social sentiment analysis
- Risk assessment and prediction

Current Market Context:
${this.formatMarketContext(context)}

Analysis Guidelines:

1. Market Analysis
- Always reference specific price points and metrics from the provided data
- Compare current values to historical trends
- Highlight significant changes in trading volume or market cap
- Analyze market dominance and relative performance
- Consider market sentiment and momentum

2. Technical Analysis
- Evaluate RSI trends (Oversold < 30, Overbought > 70)
- Analyze MACD crossovers and momentum
- Consider EMA trends and potential support/resistance levels
- Assess volume patterns and their implications
- Highlight any notable technical patterns

3. Risk Assessment
- Market volatility evaluation
- Liquidity analysis
- Technical risk factors
- On-chain metrics evaluation
- Social sentiment impact
- Provide risk level: Low (1-3), Medium (4-7), High (8-10)

4. Response Format
- Begin with a clear summary
- Organize analysis by sections
- Use bullet points for key metrics
- Include specific numbers and percentages
- Reference timeframes
- End with actionable insights

5. Data Context
- Acknowledge data limitations
- Express confidence levels in predictions
- Note any unusual patterns or anomalies
- Consider broader market conditions
- Factor in relevant news or events

Response Style:
- Professional and data-driven
- Clear and concise
- Objective analysis
- Evidence-based conclusions
- Educational when relevant

If user preferences are specified:
- Risk Tolerance: ${this.memory.userPreferences?.riskTolerance || 'medium'}
- Analysis Depth: ${this.memory.userPreferences?.analysisDepth || 'detailed'}

Remember to:
- Prioritize accuracy over speculation
- Highlight both risks and opportunities
- Maintain objectivity in analysis
- Consider multiple timeframes
- Acknowledge market uncertainty
- Reference specific data points`;
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

      const tokens = this.extractTokensFromQuery(query);
      console.log('Extracted tokens:', tokens);

      if (tokens.length === 0) {
        return "I couldn't identify any specific cryptocurrencies in your query. Could you please specify which tokens you'd like to analyze?";
      }

      const marketContext = await this.fetchMarketContext(tokens);
      if (Object.keys(marketContext).length === 0) {
        return "I'm having trouble accessing current market data. Please try again in a moment.";
      }

      console.log('Market context fetched:', Object.keys(marketContext));

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(marketContext),
          timestamp: Date.now()
        },
        ...this.memory.conversationHistory.slice(-3).map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.timestamp
        })),
        {
          role: 'user',
          content: query,
          timestamp: Date.now()
        }
      ];

      const response = await this.processWithGroq(messages);
      console.log('Got LLM response');

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

      if (this.memory.conversationHistory.length > 10) {
        this.memory.conversationHistory = this.memory.conversationHistory.slice(-10);
      }

      this.memory.lastQuery = query;
      this.memory.recentTokens = tokens;

      return response;

    } catch (error) {
      console.error('Chat error:', error);
      return "I encountered an error while processing your request. Please try again or rephrase your query.";
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