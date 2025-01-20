// jest.config.ts
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};

export default config;

// tsconfig.test.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "isolatedModules": false
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "tests/**/*.ts",
    "tests/**/*.tsx"
  ],
  "exclude": [
    "node_modules"
  ]
}

// tests/setup.ts
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock fetch
global.fetch = jest.fn();

// Environment variables for testing
process.env.GROQ_API_KEY = 'test-key';
process.env.COOKIE_FUN_API_KEY = 'test-key';
process.env.COINGECKO_API_KEY = 'test-key';

// Mock WebSocket
class MockWebSocket {
  constructor(url: string) {}
  send(data: any) {}
  close() {}
  addEventListener(event: string, callback: Function) {}
  removeEventListener(event: string, callback: Function) {}
}

global.WebSocket = MockWebSocket as any;