export const TOKEN_MAPPINGS: { [key: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'BITCOIN': 'bitcoin',
  'ETHEREUM': 'ethereum',
  'SOLANA': 'solana'
};

export function mapTokenToCoingeckoId(token: string): string {
  const upperToken = token.toUpperCase();
  return TOKEN_MAPPINGS[upperToken] || token.toLowerCase();
}