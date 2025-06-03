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

// Crypto polyfill for browser
try {
  (globalThis as any).crypto = globalThis.crypto || window.crypto;
} catch (e) {
  // Fallback for environments without crypto
}

// Stream polyfill for browser (minimal implementation)
(globalThis as any).stream = {
  Readable: class Readable {},
  Writable: class Writable {},
  Transform: class Transform {}
};

export {};