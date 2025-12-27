/**
 * NumberInput - Custom styled number input with increment/decrement buttons.
 *
 * Features:
 * - Clean, modern design
 * - Custom +/- buttons instead of native spinners
 * - Keyboard support (up/down arrows)
 * - Configurable min/max/step
 * - Dark mode compatible
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import './NumberInput.css';

interface NumberInputProps {
  /** Current value */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Label text */
  label?: string;
  /** Suffix text (e.g., "px", "%") */
  suffix?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  suffix,
  disabled = false,
  className = '',
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync local value with external value when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value.toString());
    }
  }, [value, isFocused]);

  const clampValue = useCallback(
    (val: number): number => {
      let clamped = val;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      return clamped;
    },
    [min, max]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      const clamped = clampValue(parsed);
      onChange(clamped);
      setLocalValue(clamped.toString());
    } else {
      setLocalValue(value.toString());
    }
  }, [localValue, clampValue, onChange, value]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    inputRef.current?.select();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newValue = clampValue(value + step);
        onChange(newValue);
        setLocalValue(newValue.toString());
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newValue = clampValue(value - step);
        onChange(newValue);
        setLocalValue(newValue.toString());
      } else if (e.key === 'Enter') {
        inputRef.current?.blur();
      }
    },
    [value, step, clampValue, onChange]
  );

  const increment = useCallback(() => {
    const newValue = clampValue(value + step);
    onChange(newValue);
    setLocalValue(newValue.toString());
  }, [value, step, clampValue, onChange]);

  const decrement = useCallback(() => {
    const newValue = clampValue(value - step);
    onChange(newValue);
    setLocalValue(newValue.toString());
  }, [value, step, clampValue, onChange]);

  // Handle long press for continuous increment/decrement
  const startContinuousChange = useCallback(
    (action: () => void) => {
      action(); // Initial action
      intervalRef.current = setInterval(action, 100);
    },
    []
  );

  const stopContinuousChange = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const isAtMin = min !== undefined && value <= min;
  const isAtMax = max !== undefined && value >= max;

  return (
    <div className={`number-input-row ${className}`}>
      {label && <label className="number-input-label">{label}</label>}
      <div className={`number-input-container ${disabled ? 'disabled' : ''}`}>
        <button
          type="button"
          className={`number-input-btn decrement ${isAtMin ? 'disabled' : ''}`}
          onMouseDown={() => !isAtMin && !disabled && startContinuousChange(decrement)}
          onMouseUp={stopContinuousChange}
          onMouseLeave={stopContinuousChange}
          disabled={disabled || isAtMin}
          tabIndex={-1}
          aria-label="Decrease value"
        >
          <svg width="8" height="2" viewBox="0 0 8 2" fill="currentColor">
            <rect width="8" height="2" rx="1" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="number-input-field"
          disabled={disabled}
        />
        <button
          type="button"
          className={`number-input-btn increment ${isAtMax ? 'disabled' : ''}`}
          onMouseDown={() => !isAtMax && !disabled && startContinuousChange(increment)}
          onMouseUp={stopContinuousChange}
          onMouseLeave={stopContinuousChange}
          disabled={disabled || isAtMax}
          tabIndex={-1}
          aria-label="Increase value"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <rect x="3" width="2" height="8" rx="1" />
            <rect y="3" width="8" height="2" rx="1" />
          </svg>
        </button>
      </div>
      {suffix && <span className="number-input-suffix">{suffix}</span>}
    </div>
  );
}

export default NumberInput;
