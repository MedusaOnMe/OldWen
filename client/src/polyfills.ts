// Browser polyfills for Node.js modules
import { Buffer } from 'buffer';

// Make Buffer available globally
(globalThis as any).Buffer = Buffer;

// Simple process polyfill for browser environment
(globalThis as any).process = {
  env: {},
  browser: true,
  nextTick: (fn: Function) => Promise.resolve().then(() => fn())
};

export {};