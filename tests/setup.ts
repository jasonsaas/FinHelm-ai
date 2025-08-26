import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Convex client globally
vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(() => ({
    action: vi.fn(),
    query: vi.fn(),
    mutation: vi.fn(),
  })),
}));

// Mock React hooks
vi.mock('convex/react', () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => undefined),
  useAction: vi.fn(() => vi.fn()),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock window.matchMedia for CSS media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock performance.now for timing tests
global.performance = global.performance || {
  now: vi.fn(() => Date.now()),
} as any;