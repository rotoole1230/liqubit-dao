// src/lib/commands.ts
import { EnhancedLLM } from '../ai/enhanced-conversation';
import { MarketDataAggregator } from '../data/market-data-aggregator';

export interface CommandHandler {
  description: string;
  usage: string;
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
    usage: 'analyze <token> [timeframe]',
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
    usage: 'market [token]',
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
    usage: 'help [command]',
    execute: async (args: string[]) => {
      const [command] = args;
      if (command) {
        const cmd = commands[command];
        if (!cmd) {
          throw new Error(`Unknown command: ${command}`);
        }
        return `${command} - ${cmd.description}\nUsage: ${cmd.usage}`;
      }
      return Object.entries(commands)
        .map(([name, cmd]) => `${name} - ${cmd.description}`)
        .join('\n');
    }
  }
};

// src/pages/index.tsx
import React from 'react';
import Terminal from '../components/Terminal';

const HomePage: React.FC = () => {
  return (
    <div className="h-screen bg-gray-900">
      <Terminal />
    </div>
  );
};

export default HomePage;

// src/liqubit-ai-pipeline.ts
import { EnhancedLLM } from './ai/enhanced-conversation';
import { MarketDataAggregator } from './data/market-data-aggregator';

export interface PipelineConfig {
  apiKeys: {
    groq: string;
    coingecko: string;
    cookieFun: string;
  };
  cache: {
    ttl: number;
  };
}

export class LiqubitPipeline {
  private llm: EnhancedLLM;
  private marketData: MarketDataAggregator;

  constructor(config: PipelineConfig) {
    this.llm = new EnhancedLLM();
    this.marketData = new MarketDataAggregator();
  }

  async processQuery(query: string): Promise<string> {
    return this.llm.chat(query);
  }

  async getMarketData(token: string): Promise<any> {
    return this.marketData.getComprehensiveAnalysis(token);
  }
}