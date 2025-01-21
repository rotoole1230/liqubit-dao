interface MetricPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

interface ProviderMetrics {
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  lastError?: Error;
  metrics: Map<string, MetricPoint[]>;
}

export class DataMonitor {
  private static instance: DataMonitor;
  private metrics: Map<string, ProviderMetrics> = new Map();
  private readonly maxDataPoints = 1000;

  private constructor() {
    this.startPeriodicCleanup();
  }

  static getInstance(): DataMonitor {
    if (!DataMonitor.instance) {
      DataMonitor.instance = new DataMonitor();
    }
    return DataMonitor.instance;
  }

  recordRequest(provider: string, startTime: number): void {
    const providerMetrics = this.getOrCreateProviderMetrics(provider);
    providerMetrics.requestCount++;

    const latency = Date.now() - startTime;
    this.updateLatencyMetrics(provider, latency);
  }

  recordSuccess(provider: string): void {
    const providerMetrics = this.getOrCreateProviderMetrics(provider);
    providerMetrics.successCount++;
  }

  recordFailure(provider: string, error: Error): void {
    const providerMetrics = this.getOrCreateProviderMetrics(provider);
    providerMetrics.failureCount++;
    providerMetrics.lastError = error;
  }

  recordMetric(provider: string, metricName: string, value: number, metadata?: Record<string, any>): void {
    const providerMetrics = this.getOrCreateProviderMetrics(provider);

    if (!providerMetrics.metrics.has(metricName)) {
      providerMetrics.metrics.set(metricName, []);
    }

    const metricPoints = providerMetrics.metrics.get(metricName)!;
    metricPoints.push({
      timestamp: Date.now(),
      value,
      metadata
    });

    // Maintain fixed size for metrics array
    if (metricPoints.length > this.maxDataPoints) {
      metricPoints.shift();
    }
  }

  getProviderStats(provider: string): ProviderMetrics | undefined {
    return this.metrics.get(provider);
  }

  getMetricHistory(provider: string, metricName: string): MetricPoint[] {
    return this.getOrCreateProviderMetrics(provider).metrics.get(metricName) || [];
  }

  getSuccessRate(provider: string): number {
    const metrics = this.metrics.get(provider);
    if (!metrics || metrics.requestCount === 0) return 0;
    return (metrics.successCount / metrics.requestCount) * 100;
  }

  private getOrCreateProviderMetrics(provider: string): ProviderMetrics {
    if (!this.metrics.has(provider)) {
      this.metrics.set(provider, {
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        averageLatency: 0,
        metrics: new Map()
      });
    }
    return this.metrics.get(provider)!;
  }

  private updateLatencyMetrics(provider: string, latency: number): void {
    const metrics = this.getOrCreateProviderMetrics(provider);
    metrics.averageLatency = (metrics.averageLatency * (metrics.requestCount - 1) + latency) / metrics.requestCount;
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      this.metrics.forEach((providerMetrics, provider) => {
        providerMetrics.metrics.forEach((points, metricName) => {
          const filteredPoints = points.filter(point => point.timestamp > oneDayAgo);
          providerMetrics.metrics.set(metricName, filteredPoints);
        });
      });
    }, 60 * 60 * 1000); // Run cleanup every hour
  }
}

// Example usage in a provider:
export function withMonitoring<T>(
  provider: string,
  operation: () => Promise<T>
): Promise<T> {
  const monitor = DataMonitor.getInstance();
  const startTime = Date.now();

  return operation()
    .then(result => {
      monitor.recordRequest(provider, startTime);
      monitor.recordSuccess(provider);
      return result;
    })
    .catch(error => {
      monitor.recordRequest(provider, startTime);
      monitor.recordFailure(provider, error);
      throw error;
    });
}