export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly response?: any
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export function formatCurrency(value: number, decimals: number = 2): string {
  if (!value && value !== 0) return 'N/A';

  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(decimals)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(decimals)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(decimals)}K`;
  }
  return `$${value.toFixed(decimals)}`;
}

export function formatPercentage(value: number, decimals: number = 2): string {
  if (!value && value !== 0) return 'N/A';

  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  config: RetryConfig = { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 },
  providerName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error as Error;

      if (attempt < config.maxRetries - 1) {
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );

        console.warn(
          `${providerName} request failed (attempt ${attempt + 1}/${config.maxRetries}). Retrying in ${delay}ms...`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new ProviderError(
    `${providerName} request failed after ${config.maxRetries} attempts: ${lastError?.message}`,
    providerName
  );
}

export function validateResponse(data: any, requiredFields: string[], provider: string): void {
  const missingFields = requiredFields.filter(field => !data[field]);

  if (missingFields.length > 0) {
    throw new ProviderError(
      `Missing required fields from ${provider}: ${missingFields.join(', ')}`,
      provider
    );
  }
}

export class RateLimiter {
  private lastRequest: number = 0;
  private requestQueue: Promise<void> = Promise.resolve();

  constructor(private minInterval: number) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    const timeToWait = Math.max(0, this.lastRequest + this.minInterval - now);

    this.requestQueue = this.requestQueue.then(
      () => new Promise(resolve => setTimeout(resolve, timeToWait))
    );

    await this.requestQueue;
    this.lastRequest = Date.now();
  }
}

export function validateApiKey(apiKey: string | undefined, provider: string): void {
  if (!apiKey) {
    throw new ProviderError(
      `Missing API key for ${provider}. Please check your environment variables.`,
      provider
    );
  }
}

export async function handleApiResponse<T>(
  response: Response,
  provider: string
): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'No error body');
    throw new ProviderError(
      `API request failed: ${response.status} ${response.statusText}\n${errorBody}`,
      provider,
      response.status,
      errorBody
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ProviderError(
      `Failed to parse JSON response: ${(error as Error).message}`,
      provider
    );
  }
}