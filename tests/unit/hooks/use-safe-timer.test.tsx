import { renderHook } from '@testing-library/react';
import { useSafeTimeout, useSafeInterval } from '@/hooks/use-safe-timer';

describe('useSafeTimer hooks', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useSafeTimeout', () => {
    it('should execute callback after specified delay', () => {
      const callback = jest.fn();
      renderHook(() => useSafeTimeout(callback, 1000));

      expect(callback).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(999);
      expect(callback).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should clear timeout on unmount', () => {
      const callback = jest.fn();
      const { unmount } = renderHook(() => useSafeTimeout(callback, 1000));

      unmount();
      
      jest.advanceTimersByTime(2000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle zero delay', () => {
      const callback = jest.fn();
      renderHook(() => useSafeTimeout(callback, 0));

      jest.advanceTimersByTime(0);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should update callback without restarting timer', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const { rerender } = renderHook(
        ({ cb, delay }) => useSafeTimeout(cb, delay),
        { initialProps: { cb: callback1, delay: 1000 } }
      );

      jest.advanceTimersByTime(500);
      
      // Update callback
      rerender({ cb: callback2, delay: 1000 });
      
      jest.advanceTimersByTime(500);
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should restart timer when delay changes', () => {
      const callback = jest.fn();
      
      const { rerender } = renderHook(
        ({ delay }) => useSafeTimeout(callback, delay),
        { initialProps: { delay: 1000 } }
      );

      jest.advanceTimersByTime(500);
      
      // Change delay
      rerender({ delay: 2000 });
      
      jest.advanceTimersByTime(1500);
      expect(callback).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(500);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle null/undefined delay', () => {
      const callback = jest.fn();
      const { rerender } = renderHook(
        ({ delay }) => useSafeTimeout(callback, delay),
        { initialProps: { delay: null as any } }
      );

      jest.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();
      
      // Set valid delay
      rerender({ delay: 500 });
      jest.advanceTimersByTime(500);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('useSafeInterval', () => {
    it('should execute callback repeatedly at specified interval', () => {
      const callback = jest.fn();
      renderHook(() => useSafeInterval(callback, 1000));

      expect(callback).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(2);
      
      jest.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(4);
    });

    it('should clear interval on unmount', () => {
      const callback = jest.fn();
      const { unmount } = renderHook(() => useSafeInterval(callback, 1000));

      jest.advanceTimersByTime(500);
      unmount();
      
      jest.advanceTimersByTime(2000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should update callback without restarting interval', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const { rerender } = renderHook(
        ({ cb, delay }) => useSafeInterval(cb, delay),
        { initialProps: { cb: callback1, delay: 1000 } }
      );

      jest.advanceTimersByTime(500);
      
      // Update callback
      rerender({ cb: callback2, delay: 1000 });
      
      jest.advanceTimersByTime(500);
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should restart interval when delay changes', () => {
      const callback = jest.fn();
      
      const { rerender } = renderHook(
        ({ delay }) => useSafeInterval(callback, delay),
        { initialProps: { delay: 1000 } }
      );

      jest.advanceTimersByTime(500);
      
      // Change delay
      rerender({ delay: 2000 });
      
      jest.advanceTimersByTime(1500);
      expect(callback).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(500);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pause interval with null/undefined delay', () => {
      const callback = jest.fn();
      const { rerender } = renderHook(
        ({ delay }) => useSafeInterval(callback, delay),
        { initialProps: { delay: 1000 } }
      );

      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Pause interval
      rerender({ delay: null as any });
      
      jest.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(1); // Still 1
      
      // Resume interval
      rerender({ delay: 500 });
      
      jest.advanceTimersByTime(500);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should handle very short intervals', () => {
      const callback = jest.fn();
      renderHook(() => useSafeInterval(callback, 10));

      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(10);
    });

    it('should handle callback that throws error', () => {
      const error = new Error('Callback error');
      const callback = jest.fn(() => {
        throw error;
      });
      
      // Mock console.error
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      renderHook(() => useSafeInterval(callback, 1000));

      // Interval should continue even if callback throws
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(2);
      
      consoleError.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple simultaneous timeouts', () => {
      const callbacks = [jest.fn(), jest.fn(), jest.fn()];
      
      renderHook(() => {
        useSafeTimeout(callbacks[0], 1000);
        useSafeTimeout(callbacks[1], 2000);
        useSafeTimeout(callbacks[2], 1500);
      });

      jest.advanceTimersByTime(1000);
      expect(callbacks[0]).toHaveBeenCalledTimes(1);
      expect(callbacks[1]).toHaveBeenCalledTimes(0);
      expect(callbacks[2]).toHaveBeenCalledTimes(0);
      
      jest.advanceTimersByTime(500);
      expect(callbacks[0]).toHaveBeenCalledTimes(1);
      expect(callbacks[1]).toHaveBeenCalledTimes(0);
      expect(callbacks[2]).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(500);
      expect(callbacks[0]).toHaveBeenCalledTimes(1);
      expect(callbacks[1]).toHaveBeenCalledTimes(1);
      expect(callbacks[2]).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid re-renders', () => {
      const callback = jest.fn();
      let delay = 1000;
      
      const { rerender } = renderHook(() => useSafeTimeout(callback, delay));

      // Rapid re-renders with same delay
      for (let i = 0; i < 10; i++) {
        rerender();
      }

      jest.advanceTimersByTime(1000);
      // Should still only call once
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should clean up properly when switching between timeout and interval', () => {
      const timeoutCallback = jest.fn();
      const intervalCallback = jest.fn();
      
      const { unmount: unmountTimeout } = renderHook(() => 
        useSafeTimeout(timeoutCallback, 1000)
      );
      
      const { unmount: unmountInterval } = renderHook(() => 
        useSafeInterval(intervalCallback, 1000)
      );

      jest.advanceTimersByTime(500);
      
      unmountTimeout();
      unmountInterval();
      
      jest.advanceTimersByTime(2000);
      
      expect(timeoutCallback).not.toHaveBeenCalled();
      expect(intervalCallback).not.toHaveBeenCalled();
    });
  });
});
