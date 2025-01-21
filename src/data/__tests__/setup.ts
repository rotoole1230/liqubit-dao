// src/data/__tests__/setup.ts

// Mock fetch globally
global.fetch = jest.fn();

// Add custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () => 
        pass
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockClear();
});

// Add missing DOM environment variables
if (typeof window === 'undefined') {
  (global as any).window = {
    fs: {
      readFile: jest.fn()
    }
  };
}