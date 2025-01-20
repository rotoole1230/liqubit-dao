
import { EnhancedLLM } from '../ai/enhanced-conversation';
import { MarketDataAggregator } from '../data/market-data-aggregator';

export interface CommandHandler {
  description: string;
  execute: (args: string[]) => Promise<string>;
}

export interface CommandRegistry {
  [key: string]: CommandHandler;
}

const llm = new EnhancedLLM();
const marketData = new MarketDataAggregator();

export const commands: CommandRegistry = {
  analyze: {
    description: 'Analyze a cryptocurrency token',
    execute: async (args: string[]) => {
      const [token, timeframe = '24h'] = args;
      if (!token) {
        throw new Error('Usage: analyze <token> [timeframe]');
      }
      const analysis = await llm.chat(`Analyze ${token} for the ${timeframe} timeframe`);
      return analysis;
    }
  },

  market: {
    description: 'Get market overview or specific token data',
    execute: async (args: string[]) => {
      const [token] = args;
      if (token) {
        const data = await marketData.getComprehensiveAnalysis(token);
        return JSON.stringify(data, null, 2);
      }
      const trends = await marketData.getMarketTrends();
      return JSON.stringify(trends, null, 2);
    }
  },

  help: {
    description: 'Show available commands',
    execute: async () => {
      return Object.entries(commands)
        .map(([key, cmd]) => `/${key} - ${cmd.description}`)
        .join('\n');
    }
  }
};
