import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useConnectionStore,
  getTokenTimeRemaining,
  tokenNeedsRefresh,
  tokenIsExpiringSoon,
  startTokenExpirationMonitor,
  stopTokenExpirationMonitor,
} from './connectionStore';

describe('connectionStore', () => {
  beforeEach(() => {
    useConnectionStore.getState().reset();
    stopTokenExpirationMonitor();
  });

  afterEach(() => {
    stopTokenExpirationMonitor();
  });

  describe('token state management', () => {
    it('initializes with null token', () => {
      const state = useConnectionStore.getState();
      expect(state.token).toBeNull();
      expect(state.tokenExpiresAt).toBeNull();
    });

    it('sets token with expiration', () => {
      const expiresAt = Date.now() + 3600000; // 1 hour
      useConnectionStore.getState().setToken('test-token', expiresAt);

      const state = useConnectionStore.getState();
      expect(state.token).toBe('test-token');
      expect(state.tokenExpiresAt).toBe(expiresAt);
    });

    it('clears token on reset', () => {
      useConnectionStore.getState().setToken('test-token', Date.now() + 3600000);
      useConnectionStore.getState().reset();

      const state = useConnectionStore.getState();
      expect(state.token).toBeNull();
      expect(state.tokenExpiresAt).toBeNull();
    });

    it('isTokenValid returns true for valid token', () => {
      useConnectionStore.getState().setToken('test-token', Date.now() + 3600000);
      expect(useConnectionStore.getState().isTokenValid()).toBe(true);
    });

    it('isTokenValid returns false for expired token', () => {
      useConnectionStore.getState().setToken('test-token', Date.now() - 1000);
      expect(useConnectionStore.getState().isTokenValid()).toBe(false);
    });

    it('isTokenValid returns false for null token', () => {
      expect(useConnectionStore.getState().isTokenValid()).toBe(false);
    });

    it('isTokenValid returns true for token without expiry', () => {
      useConnectionStore.getState().setToken('test-token', null);
      expect(useConnectionStore.getState().isTokenValid()).toBe(true);
    });
  });

  describe('getTokenTimeRemaining', () => {
    it('returns null when no expiration set', () => {
      expect(getTokenTimeRemaining()).toBeNull();
    });

    it('returns time remaining for valid token', () => {
      const expiresIn = 3600000; // 1 hour
      useConnectionStore.getState().setToken('test-token', Date.now() + expiresIn);

      const remaining = getTokenTimeRemaining();
      expect(remaining).not.toBeNull();
      // Allow 100ms tolerance for test execution time
      expect(remaining).toBeGreaterThan(expiresIn - 100);
      expect(remaining).toBeLessThanOrEqual(expiresIn);
    });

    it('returns negative value for expired token', () => {
      useConnectionStore.getState().setToken('test-token', Date.now() - 1000);

      const remaining = getTokenTimeRemaining();
      expect(remaining).toBeLessThan(0);
    });
  });

  describe('tokenNeedsRefresh', () => {
    it('returns false when no expiration set', () => {
      expect(tokenNeedsRefresh()).toBe(false);
    });

    it('returns false for token with plenty of time', () => {
      useConnectionStore.getState().setToken('test-token', Date.now() + 3600000);
      expect(tokenNeedsRefresh()).toBe(false);
    });

    it('returns true for token within refresh buffer', () => {
      // Token expires in 4 minutes (within 5 min buffer)
      useConnectionStore.getState().setToken('test-token', Date.now() + 4 * 60 * 1000);
      expect(tokenNeedsRefresh()).toBe(true);
    });

    it('returns false for already expired token', () => {
      useConnectionStore.getState().setToken('test-token', Date.now() - 1000);
      expect(tokenNeedsRefresh()).toBe(false);
    });
  });

  describe('tokenIsExpiringSoon', () => {
    it('returns false when no expiration set', () => {
      expect(tokenIsExpiringSoon()).toBe(false);
    });

    it('returns false for token with plenty of time', () => {
      useConnectionStore.getState().setToken('test-token', Date.now() + 3600000);
      expect(tokenIsExpiringSoon()).toBe(false);
    });

    it('returns true for token within warning threshold', () => {
      // Token expires in 8 minutes (within 10 min threshold)
      useConnectionStore.getState().setToken('test-token', Date.now() + 8 * 60 * 1000);
      expect(tokenIsExpiringSoon()).toBe(true);
    });

    it('returns false for already expired token', () => {
      useConnectionStore.getState().setToken('test-token', Date.now() - 1000);
      expect(tokenIsExpiringSoon()).toBe(false);
    });
  });

  describe('token expiration monitor', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calls onTokenExpiring when token is about to expire', () => {
      const onExpiring = vi.fn();
      const onExpired = vi.fn();

      // Set up token that expires in 4 minutes
      useConnectionStore.getState().setStatus('authenticated');
      useConnectionStore.getState().setToken('test-token', Date.now() + 4 * 60 * 1000);

      startTokenExpirationMonitor({ onTokenExpiring: onExpiring, onTokenExpired: onExpired });

      // Should trigger immediately since within buffer
      expect(onExpiring).toHaveBeenCalledTimes(1);
      expect(onExpired).not.toHaveBeenCalled();
    });

    it('calls onTokenExpired when token expires', () => {
      const onExpiring = vi.fn();
      const onExpired = vi.fn();

      // Set up token that has just expired
      useConnectionStore.getState().setStatus('authenticated');
      useConnectionStore.getState().setToken('test-token', Date.now() - 1000);

      startTokenExpirationMonitor({ onTokenExpiring: onExpiring, onTokenExpired: onExpired });

      // Should trigger expired callback immediately
      expect(onExpired).toHaveBeenCalledTimes(1);
    });

    it('does not trigger when not authenticated', () => {
      const onExpiring = vi.fn();
      const onExpired = vi.fn();

      // Set up expired token but not authenticated
      useConnectionStore.getState().setToken('test-token', Date.now() - 1000);
      // Status is 'disconnected' by default

      startTokenExpirationMonitor({ onTokenExpiring: onExpiring, onTokenExpired: onExpired });

      expect(onExpiring).not.toHaveBeenCalled();
      expect(onExpired).not.toHaveBeenCalled();
    });

    it('checks periodically', () => {
      const onExpiring = vi.fn();
      const onExpired = vi.fn();

      // Set up token with plenty of time
      useConnectionStore.getState().setStatus('authenticated');
      useConnectionStore.getState().setToken('test-token', Date.now() + 3600000);

      startTokenExpirationMonitor({ onTokenExpiring: onExpiring, onTokenExpired: onExpired });

      // Initial check - should not trigger
      expect(onExpiring).not.toHaveBeenCalled();

      // Fast forward 1 minute
      vi.advanceTimersByTime(60000);

      // Still should not trigger (token still valid)
      expect(onExpiring).not.toHaveBeenCalled();
    });

    it('stopTokenExpirationMonitor clears interval', () => {
      const onExpiring = vi.fn();

      useConnectionStore.getState().setStatus('authenticated');
      useConnectionStore.getState().setToken('test-token', Date.now() + 3600000);

      startTokenExpirationMonitor({ onTokenExpiring: onExpiring });
      stopTokenExpirationMonitor();

      // Update token to trigger expiring state
      useConnectionStore.getState().setToken('test-token', Date.now() + 4 * 60 * 1000);

      // Advance time past check interval
      vi.advanceTimersByTime(120000);

      // Should not have been called since monitor was stopped
      expect(onExpiring).not.toHaveBeenCalled();
    });
  });

  describe('connection status', () => {
    it('sets status and clears error', () => {
      useConnectionStore.getState().setStatus('error', 'Test error');
      expect(useConnectionStore.getState().error).toBe('Test error');

      useConnectionStore.getState().setStatus('connected');
      expect(useConnectionStore.getState().status).toBe('connected');
      expect(useConnectionStore.getState().error).toBeNull();
    });

    it('tracks lastConnectedAt on authentication', () => {
      const before = Date.now();
      useConnectionStore.getState().setStatus('authenticated');
      const after = Date.now();

      const { lastConnectedAt } = useConnectionStore.getState();
      expect(lastConnectedAt).toBeGreaterThanOrEqual(before);
      expect(lastConnectedAt).toBeLessThanOrEqual(after);
    });

    it('manages reconnect attempts', () => {
      expect(useConnectionStore.getState().reconnectAttempts).toBe(0);

      useConnectionStore.getState().incrementReconnectAttempts();
      useConnectionStore.getState().incrementReconnectAttempts();
      expect(useConnectionStore.getState().reconnectAttempts).toBe(2);

      useConnectionStore.getState().resetReconnectAttempts();
      expect(useConnectionStore.getState().reconnectAttempts).toBe(0);
    });
  });
});
