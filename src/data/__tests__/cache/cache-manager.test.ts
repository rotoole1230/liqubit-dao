import { CacheManager } from '../../cache/cache-manager';

describe('Cache Manager', () => {
  let cacheManager: CacheManager<any>;

  beforeEach(() => {
    cacheManager = new CacheManager({
      ttl: 1000, // 1 second for testing
      maxSize: 3
    });
  });

  it('should store and retrieve values', () => {
    cacheManager.set('test-key', { data: 'test-value' });
    const result = cacheManager.get('test-key');
    expect(result).toEqual({ data: 'test-value' });
  });

  it('should handle cache expiration', async () => {
    cacheManager.set('test-key', { data: 'test-value' });
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for TTL to expire
    const result = cacheManager.get('test-key');
    expect(result).toBeNull();
  });

  it('should enforce maximum cache size', () => {
    cacheManager.set('key1', 'value1');
    cacheManager.set('key2', 'value2');
    cacheManager.set('key3', 'value3');
    cacheManager.set('key4', 'value4'); // Should evict oldest entry

    expect(cacheManager.get('key1')).toBeNull();
    expect(cacheManager.get('key2')).toBe('value2');
    expect(cacheManager.get('key3')).toBe('value3');
    expect(cacheManager.get('key4')).toBe('value4');
  });

  it('should handle null values correctly', () => {
    cacheManager.set('null-key', null);
    const result = cacheManager.get('null-key');
    expect(result).toBeNull();
  });

  it('should handle complex objects', () => {
    const complexObject = {
      id: 1,
      name: 'test',
      nested: {
        value: true
      },
      array: [1, 2, 3]
    };

    cacheManager.set('complex', complexObject);
    const result = cacheManager.get('complex');
    expect(result).toEqual(complexObject);
  });

  it('should handle concurrent operations', async () => {
    const operations = Array(10).fill(0).map((_, i) => {
      return cacheManager.set(`key${i}`, `value${i}`);
    });

    await Promise.all(operations);
    expect(cacheManager.get('key9')).toBe('value9');
  });
});