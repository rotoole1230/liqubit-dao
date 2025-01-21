import { DataMonitor, withMonitoring } from '../../monitoring/data-monitor';

describe('Data Monitor', () => {
  let monitor: DataMonitor;

  beforeEach(() => {
    monitor = DataMonitor.getInstance();
  });

  describe('Basic Monitoring', () => {
    it('should track successful requests', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      await withMonitoring('test-provider', mockOperation);

      const stats = monitor.getProviderStats('test-provider');
      expect(stats?.requestCount).toBe(1);
      expect(stats?.successCount).toBe(1);
      expect(stats?.failureCount).toBe(0);
    });

    it('should track failed requests', async () => {
      const mockOperation = jest.fn().mockRejecte