export interface MarketData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  circulatingSupply: number;
  totalSupply: number;
  lastUpdated: Date;
}

export interface OnChainMetrics {
  symbol: string;
  activeAddresses24h: number;
  transactionCount24h: number;
  averageTransactionValue: number;
  largeTransactions24h: number; // Transactions > $100k
  netFlow24h: number; // Net exchange flow
  totalValueLocked?: number; // For DeFi tokens
  dailyActiveContracts?: number; // For smart contract platforms
  gasUsed24h?: number; // For platforms like ETH, SOL
  timestamp: Date;
}

export interface TechnicalIndicators {
  symbol: string;
  rsi14: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  ema: {
    ema9: number;
    ema20: number;
    ema50: number;
    ema200: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  volume: {
    obv: number; // On-balance volume
    vwap: number; // Volume-weighted average price
  };
  timestamp: Date;
}

export interface SocialMetrics {
  symbol: string;
  twitterMentions24h: number;
  sentimentScore24h: number; // -1 to 1
  telegramActiveUsers: number;
  redditSubscribers: number;
  githubCommits24h?: number;
  developerActivity?: number;
  timestamp: Date;
}

export interface BaseProvider {
  getMarketData(symbol: string): Promise<MarketData>;
  getOnChainMetrics(symbol: string): Promise<OnChainMetrics>;
  getTechnicalIndicators(symbol: string): Promise<TechnicalIndicators>;
  getSocialMetrics(symbol: string): Promise<SocialMetrics>;
}