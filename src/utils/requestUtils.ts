/**
 * Request deduplication and debouncing utilities.
 *
 * Prevents duplicate in-flight requests and provides debouncing
 * for rapid successive operations.
 */

/**
 * In-flight request tracker that deduplicates identical requests.
 * If a request with the same key is already in progress, returns
 * the existing promise instead of starting a new request.
 */
export class RequestDeduplicator<T> {
  private inFlight: Map<string, Promise<T>> = new Map();

  /**
   * Execute a request with deduplication.
   * If a request with the same key is already in progress,
   * returns the existing promise.
   *
   * @param key Unique identifier for this request
   * @param requestFn The request function to execute
   * @returns Promise that resolves with the request result
   */
  async request(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Return existing in-flight request if present
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    // Create and track new request
    const promise = requestFn().finally(() => {
      // Clean up once request completes
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Check if a request with the given key is in progress.
   */
  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  /**
   * Get the number of in-flight requests.
   */
  get size(): number {
    return this.inFlight.size;
  }

  /**
   * Cancel tracking of all in-flight requests.
   * Note: This does not cancel the actual requests, just removes tracking.
   */
  clear(): void {
    this.inFlight.clear();
  }
}

/**
 * Options for debounced function.
 */
export interface DebounceOptions {
  /** Delay in milliseconds before executing (default: 250) */
  delay?: number;
  /** Execute on leading edge instead of trailing (default: false) */
  leading?: boolean;
  /** Maximum time to wait before forcing execution (default: none) */
  maxWait?: number;
}

/**
 * Debounced function result.
 */
export interface DebouncedFunction<T extends (...args: never[]) => unknown> {
  /** Call the debounced function */
  (...args: Parameters<T>): void;
  /** Cancel pending execution */
  cancel(): void;
  /** Execute immediately and cancel pending */
  flush(): void;
  /** Check if there's a pending execution */
  isPending(): boolean;
}

/**
 * Create a debounced version of a function.
 * The debounced function delays invoking the provided function
 * until after the specified delay has elapsed since the last call.
 *
 * @param fn Function to debounce
 * @param options Debounce options
 * @returns Debounced function with cancel and flush methods
 */
export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  const { delay = 250, leading = false, maxWait } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxWaitTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let isLeadingInvoked = false;

  const invoke = (): void => {
    if (lastArgs) {
      const args = lastArgs;
      lastArgs = null;
      isLeadingInvoked = false;
      fn(...args);
    }
  };

  const cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxWaitTimeoutId) {
      clearTimeout(maxWaitTimeoutId);
      maxWaitTimeoutId = null;
    }
    lastArgs = null;
    isLeadingInvoked = false;
  };

  const flush = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxWaitTimeoutId) {
      clearTimeout(maxWaitTimeoutId);
      maxWaitTimeoutId = null;
    }
    invoke();
  };

  const isPending = (): boolean => {
    return timeoutId !== null || maxWaitTimeoutId !== null;
  };

  const debounced = (...args: Parameters<T>): void => {
    lastArgs = args;

    // Handle leading edge
    if (leading && !isLeadingInvoked) {
      isLeadingInvoked = true;
      fn(...args);
      return;
    }

    // Clear existing trailing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set up trailing edge timeout
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (maxWaitTimeoutId) {
        clearTimeout(maxWaitTimeoutId);
        maxWaitTimeoutId = null;
      }
      invoke();
    }, delay);

    // Set up max wait timeout if specified and not already set
    if (maxWait !== undefined && !maxWaitTimeoutId) {
      maxWaitTimeoutId = setTimeout(() => {
        maxWaitTimeoutId = null;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        invoke();
      }, maxWait);
    }
  };

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.isPending = isPending;

  return debounced;
}

/**
 * Throttle options.
 */
export interface ThrottleOptions {
  /** Minimum time between executions in milliseconds */
  interval: number;
  /** Execute on leading edge (default: true) */
  leading?: boolean;
  /** Execute on trailing edge (default: true) */
  trailing?: boolean;
}

/**
 * Throttled function result.
 */
export interface ThrottledFunction<T extends (...args: never[]) => unknown> {
  /** Call the throttled function */
  (...args: Parameters<T>): void;
  /** Cancel pending trailing execution */
  cancel(): void;
}

/**
 * Create a throttled version of a function.
 * The throttled function only invokes the provided function
 * at most once per the specified interval.
 *
 * @param fn Function to throttle
 * @param options Throttle options
 * @returns Throttled function with cancel method
 */
export function throttle<T extends (...args: never[]) => unknown>(
  fn: T,
  options: ThrottleOptions
): ThrottledFunction<T> {
  const { interval, leading = true, trailing = true } = options;

  let lastInvokeTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const invoke = (args: Parameters<T>): void => {
    lastInvokeTime = Date.now();
    fn(...args);
  };

  const cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  const throttled = (...args: Parameters<T>): void => {
    const now = Date.now();
    const elapsed = now - lastInvokeTime;

    // Update last args for potential trailing call
    lastArgs = args;

    if (elapsed >= interval) {
      // Enough time has passed
      if (leading) {
        invoke(args);
        return;
      }
    }

    // Set up trailing call if needed
    if (trailing && !timeoutId) {
      const remaining = interval - elapsed;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (lastArgs) {
          invoke(lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }
  };

  throttled.cancel = cancel;

  return throttled;
}

/**
 * Create a hash key for an object for deduplication purposes.
 * Simple JSON stringify - not suitable for circular references.
 */
export function createRequestKey(
  operation: string,
  params: Record<string, unknown>
): string {
  return `${operation}:${JSON.stringify(params)}`;
}
