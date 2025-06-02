import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Enterprise-grade performance optimization utilities
 * Designed to handle 3000+ concurrent users with optimal performance
 */

// Debounce utility with improved typing and cancellation
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  let args: Parameters<T> | null = null;
  let timestamp: number;
  let result: ReturnType<T>;

  const later = function () {
    const last = Date.now() - timestamp;

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(null, args!);
        args = null;
      }
    }
  };

  const debounced = function (...newArgs: Parameters<T>) {
    args = newArgs;
    timestamp = Date.now();
    const callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(null, args);
      args = null;
    }
    return result;
  } as T & { cancel: () => void };

  debounced.cancel = function () {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      args = null;
    }
  };

  return debounced;
}

// Throttle utility for high-frequency events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T & { cancel: () => void } {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  const throttled = function (...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  } as T & { cancel: () => void };

  throttled.cancel = function () {
    inThrottle = false;
  };

  return throttled;
}

// Memory-efficient virtual scrolling hook
export function useVirtualScrolling<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    handleScroll
  };
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  options: IntersectionObserverInit = {},
  freezeOnceVisible: boolean = false
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const [isVisible, setIsVisible] = useState(false);

  const frozen = freezeOnceVisible && isVisible;

  const updateEntry = useCallback(
    ([entry]: IntersectionObserverEntry[]) => {
      setEntry(entry);
      setIsVisible(entry.isIntersecting);
    },
    []
  );

  useEffect(() => {
    const node = elementRef?.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const observerParams = { threshold: 0.1, ...options };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef, JSON.stringify(options), frozen, updateEntry]);

  return { entry, isVisible };
}

// Memory pool for object reuse
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize: number = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  get size(): number {
    return this.pool.length;
  }
}

// Create object pools for common objects
export const campaignPool = new ObjectPool(
  () => ({
    id: '',
    contractAddress: '',
    tokenMetadata: { name: '', symbol: '' },
    currentAmount: 0,
    targetAmount: 0,
    contributorCount: 0,
    status: 'active' as const,
    description: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  (obj) => {
    obj.id = '';
    obj.contractAddress = '';
    obj.tokenMetadata = { name: '', symbol: '' };
    obj.currentAmount = 0;
    obj.targetAmount = 0;
    obj.contributorCount = 0;
    obj.status = 'active';
    obj.description = '';
  }
);

// Efficient cache implementation with TTL and LRU eviction
export class PerformanceCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number; ttl: number }>();
  private accessOrder = new Map<K, number>();
  private maxSize: number;
  private accessCounter = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set(key: K, value: V, ttl: number = 5 * 60 * 1000): void {
    this.cleanup();

    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    this.accessOrder.set(key, ++this.accessCounter);
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return undefined;
    }

    this.accessOrder.set(key, ++this.accessCounter);
    return item.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
      }
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.size === 0) return;

    let oldestKey: K | undefined;
    let oldestAccess = Infinity;

    for (const [key, access] of this.accessOrder.entries()) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  get size(): number {
    return this.cache.size;
  }

  get stats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.accessCounter > 0 ? this.cache.size / this.accessCounter : 0
    };
  }
}

// Global performance cache instances
export const queryCache = new PerformanceCache<string, any>(2000);
export const imageCache = new PerformanceCache<string, string>(500);
export const tokenMetadataCache = new PerformanceCache<string, any>(1000);

// Performance monitoring utilities
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private thresholds = new Map<string, number>();

  setThreshold(metric: string, threshold: number): void {
    this.thresholds.set(metric, threshold);
  }

  measure<T>(name: string, fn: () => T): T;
  measure<T>(name: string, fn: () => Promise<T>): Promise<T>;
  measure<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = performance.now();
    
    const finish = (result: T) => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    };

    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.then(finish).catch(err => {
          this.recordMetric(name, performance.now() - start);
          throw err;
        });
      }
      
      return finish(result);
    } catch (error) {
      this.recordMetric(name, performance.now() - start);
      throw error;
    }
  }

  private recordMetric(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(duration);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }

    // Check threshold
    const threshold = this.thresholds.get(name);
    if (threshold && duration > threshold) {
      console.warn(`Performance threshold exceeded for ${name}: ${duration}ms > ${threshold}ms`);
    }
  }

  getStats(name: string): {
    avg: number;
    min: number;
    max: number;
    count: number;
    p95: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      avg,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: values.length,
      p95: sorted[p95Index]
    };
  }

  getAllStats(): Record<string, ReturnType<PerformanceMonitor['getStats']>> {
    const stats: Record<string, ReturnType<PerformanceMonitor['getStats']>> = {};
    for (const name of this.metrics.keys()) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }
}

// Global performance monitor
export const performanceMonitor = new PerformanceMonitor();

// Set performance thresholds
performanceMonitor.setThreshold('token-validation', 2000); // 2 seconds
performanceMonitor.setThreshold('campaign-creation', 5000); // 5 seconds
performanceMonitor.setThreshold('image-upload', 3000); // 3 seconds
performanceMonitor.setThreshold('database-query', 1000); // 1 second

// Request batching utility for API calls
export class RequestBatcher<T, R> {
  private batches = new Map<string, {
    requests: Array<{ params: T; resolve: (value: R) => void; reject: (error: any) => void }>;
    timeout: NodeJS.Timeout;
  }>();

  constructor(
    private batchFn: (params: T[]) => Promise<R[]>,
    private getBatchKey: (params: T) => string = () => 'default',
    private maxBatchSize: number = 10,
    private batchDelay: number = 50
  ) {}

  async request(params: T): Promise<R> {
    const batchKey = this.getBatchKey(params);
    
    return new Promise<R>((resolve, reject) => {
      let batch = this.batches.get(batchKey);
      
      if (!batch) {
        batch = {
          requests: [],
          timeout: setTimeout(() => this.executeBatch(batchKey), this.batchDelay)
        };
        this.batches.set(batchKey, batch);
      }

      batch.requests.push({ params, resolve, reject });

      if (batch.requests.length >= this.maxBatchSize) {
        clearTimeout(batch.timeout);
        this.executeBatch(batchKey);
      }
    });
  }

  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    this.batches.delete(batchKey);

    try {
      const params = batch.requests.map(req => req.params);
      const results = await this.batchFn(params);

      batch.requests.forEach((req, index) => {
        req.resolve(results[index]);
      });
    } catch (error) {
      batch.requests.forEach(req => {
        req.reject(error);
      });
    }
  }
}

// Memory usage monitoring
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    };
  }

  // Fallback for browsers without memory API
  return {
    used: 0,
    total: 0,
    percentage: 0
  };
}

// Component performance HOC
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  name: string
) {
  return React.memo((props: P) => {
    const renderStart = useRef<number>();
    
    useEffect(() => {
      renderStart.current = performance.now();
    });

    useEffect(() => {
      if (renderStart.current) {
        const renderTime = performance.now() - renderStart.current;
        performanceMonitor.measure(`${name}-render`, () => renderTime);
      }
    });

    return React.createElement(Component, props);
  });
}

// Network status monitoring
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string | undefined>();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection.effectiveType);

      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType);
      };

      connection.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
}

// Resource preloading utility
export function preloadResource(url: string, type: 'image' | 'script' | 'style' = 'image'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (imageCache.has(url)) {
      resolve();
      return;
    }

    let element: HTMLImageElement | HTMLLinkElement | HTMLScriptElement;

    switch (type) {
      case 'image':
        element = new Image();
        (element as HTMLImageElement).src = url;
        break;
      case 'script':
        element = document.createElement('script');
        (element as HTMLScriptElement).src = url;
        break;
      case 'style':
        element = document.createElement('link');
        (element as HTMLLinkElement).rel = 'stylesheet';
        (element as HTMLLinkElement).href = url;
        break;
    }

    element.onload = () => {
      imageCache.set(url, url);
      resolve();
    };
    element.onerror = reject;

    if (type !== 'image') {
      document.head.appendChild(element);
    }
  });
}

// Batch preload multiple resources
export async function preloadResources(urls: Array<{ url: string; type?: 'image' | 'script' | 'style' }>): Promise<void> {
  const promises = urls.map(({ url, type = 'image' }) => preloadResource(url, type));
  await Promise.allSettled(promises);
}

// Export all utilities
export * from './timestamp';

// Performance debugging utility
export function enablePerformanceDebugging(): void {
  if (typeof window !== 'undefined') {
    (window as any).wendexPerformance = {
      cache: { queryCache, imageCache, tokenMetadataCache },
      monitor: performanceMonitor,
      memory: getMemoryUsage,
      pools: { campaignPool }
    };
  }
}