import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RequestDeduplicator,
  debounce,
  throttle,
  createRequestKey,
} from './requestUtils';

describe('RequestDeduplicator', () => {
  it('executes request when none in flight', async () => {
    const dedup = new RequestDeduplicator<string>();
    const fn = vi.fn().mockResolvedValue('result');

    const result = await dedup.request('key1', fn);

    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns existing promise for duplicate request', async () => {
    const dedup = new RequestDeduplicator<string>();
    let resolveFirst: (value: string) => void = () => {};
    let callCount = 0;

    const fn = vi.fn().mockImplementation(
      () => {
        callCount++;
        // Only the first call should create a promise
        if (callCount === 1) {
          return new Promise<string>((resolve) => { resolveFirst = resolve; });
        }
        // Subsequent calls should never happen if dedup works
        return Promise.resolve('should-not-happen');
      }
    );

    const promise1 = dedup.request('key1', fn);
    const promise2 = dedup.request('key1', fn);

    // Function only called once (proves dedup returned cached promise)
    expect(fn).toHaveBeenCalledTimes(1);

    // Resolve and verify both resolve to same value
    resolveFirst('result');
    const result1 = await promise1;
    const result2 = await promise2;
    expect(result1).toBe('result');
    expect(result2).toBe('result');
  });

  it('allows new request after previous completes', async () => {
    const dedup = new RequestDeduplicator<string>();
    const fn = vi.fn().mockResolvedValue('result');

    await dedup.request('key1', fn);
    await dedup.request('key1', fn);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('tracks different keys independently', async () => {
    const dedup = new RequestDeduplicator<string>();
    let resolveFirst: (value: string) => void = () => {};
    let resolveSecond: (value: string) => void = () => {};

    const fn1 = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => { resolveFirst = resolve; })
    );
    const fn2 = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => { resolveSecond = resolve; })
    );

    const promise1 = dedup.request('key1', fn1);
    const promise2 = dedup.request('key2', fn2);

    expect(dedup.size).toBe(2);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    resolveFirst('result1');
    resolveSecond('result2');

    expect(await promise1).toBe('result1');
    expect(await promise2).toBe('result2');
  });

  it('cleans up on rejection', async () => {
    const dedup = new RequestDeduplicator<string>();
    const fn = vi.fn().mockRejectedValue(new Error('failed'));

    await expect(dedup.request('key1', fn)).rejects.toThrow('failed');
    expect(dedup.size).toBe(0);
  });

  it('isInFlight returns correct status', async () => {
    const dedup = new RequestDeduplicator<string>();
    let resolveFirst: (value: string) => void = () => {};
    const fn = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => { resolveFirst = resolve; })
    );

    expect(dedup.isInFlight('key1')).toBe(false);

    const promise = dedup.request('key1', fn);
    expect(dedup.isInFlight('key1')).toBe(true);

    resolveFirst('result');
    await promise;
    expect(dedup.isInFlight('key1')).toBe(false);
  });

  it('clear removes all tracking', async () => {
    const dedup = new RequestDeduplicator<string>();
    dedup.request('key1', () => new Promise(() => {}));
    dedup.request('key2', () => new Promise(() => {}));

    expect(dedup.size).toBe(2);
    dedup.clear();
    expect(dedup.size).toBe(0);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays execution until after delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, { delay: 100 });

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets delay on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, { delay: 100 });

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses last arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, { delay: 100 });

    debounced('first');
    debounced('second');
    debounced('third');

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('third');
  });

  it('supports leading edge', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, { delay: 100, leading: true });

    debounced('first');
    expect(fn).toHaveBeenCalledWith('first');
    expect(fn).toHaveBeenCalledTimes(1);

    debounced('second');
    debounced('third');
    expect(fn).toHaveBeenCalledTimes(1); // Still just the leading call

    vi.advanceTimersByTime(100);
    // Trailing call happens with last args
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('third');
  });

  it('cancel prevents execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, { delay: 100 });

    debounced();
    debounced.cancel();

    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('flush executes immediately', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, { delay: 100 });

    debounced('arg');
    expect(fn).not.toHaveBeenCalled();

    debounced.flush();
    expect(fn).toHaveBeenCalledWith('arg');
  });

  it('isPending returns correct status', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, { delay: 100 });

    expect(debounced.isPending()).toBe(false);

    debounced();
    expect(debounced.isPending()).toBe(true);

    vi.advanceTimersByTime(100);
    expect(debounced.isPending()).toBe(false);
  });

  it('respects maxWait', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, { delay: 100, maxWait: 150 });

    debounced('call1');
    vi.advanceTimersByTime(50);
    debounced('call2');
    vi.advanceTimersByTime(50);
    debounced('call3');
    vi.advanceTimersByTime(50);
    // maxWait (150ms) reached, should execute
    expect(fn).toHaveBeenCalledWith('call3');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes immediately on first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { interval: 100 });

    throttled('first');
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('prevents execution during interval', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { interval: 100 });

    throttled('first');
    throttled('second');
    throttled('third');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('executes trailing call after interval', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { interval: 100 });

    throttled('first');
    throttled('second');

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('second');
  });

  it('respects leading: false', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { interval: 100, leading: false });

    throttled('first');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('respects trailing: false', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { interval: 100, trailing: false });

    throttled('first');
    throttled('second');

    vi.advanceTimersByTime(100);
    // Only leading call, no trailing
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('cancel prevents trailing execution', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { interval: 100 });

    throttled('first');
    throttled('second');
    throttled.cancel();

    vi.advanceTimersByTime(100);
    // Only first call, trailing was cancelled
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows execution after interval', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, { interval: 100 });

    throttled('first');
    vi.advanceTimersByTime(100);
    throttled('second');

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'first');
    expect(fn).toHaveBeenNthCalledWith(2, 'second');
  });
});

describe('createRequestKey', () => {
  it('creates consistent keys for same params', () => {
    const key1 = createRequestKey('save', { id: '123', name: 'test' });
    const key2 = createRequestKey('save', { id: '123', name: 'test' });
    expect(key1).toBe(key2);
  });

  it('creates different keys for different operations', () => {
    const key1 = createRequestKey('save', { id: '123' });
    const key2 = createRequestKey('load', { id: '123' });
    expect(key1).not.toBe(key2);
  });

  it('creates different keys for different params', () => {
    const key1 = createRequestKey('save', { id: '123' });
    const key2 = createRequestKey('save', { id: '456' });
    expect(key1).not.toBe(key2);
  });

  it('handles nested objects', () => {
    const key = createRequestKey('update', { doc: { id: '1', name: 'test' } });
    expect(key).toContain('update');
    expect(key).toContain('id');
  });
});
