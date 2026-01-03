import React, { useCallback } from 'react';
import type { ShadowConfig } from '../shapes/GroupStyles';
import { SHADOW_PRESETS, DEFAULT_SHADOW_CONFIG } from '../shapes/GroupStyles';
import { CompactColorInput } from './CompactColorInput';
import './ShadowEditor.css';

interface ShadowEditorProps {
  value: ShadowConfig | undefined;
  onChange: (config: ShadowConfig | undefined) => void;
}

/**
 * ShadowEditor component for configuring drop shadows and glow effects.
 */
export function ShadowEditor({ value, onChange }: ShadowEditorProps) {
  const isEnabled = value?.enabled || false;

  // Toggle shadow on/off
  const handleToggle = useCallback(() => {
    if (isEnabled) {
      onChange({ ...DEFAULT_SHADOW_CONFIG, enabled: false });
    } else {
      onChange({ ...DEFAULT_SHADOW_CONFIG, enabled: true });
    }
  }, [isEnabled, onChange]);

  // Apply a preset
  const handlePreset = useCallback(
    (presetKey: keyof typeof SHADOW_PRESETS) => {
      onChange({ ...SHADOW_PRESETS[presetKey] });
    },
    [onChange]
  );

  // Update individual properties
  const handleOffsetXChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!value) return;
      onChange({ ...value, offsetX: parseFloat(e.target.value) || 0 });
    },
    [value, onChange]
  );

  const handleOffsetYChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!value) return;
      onChange({ ...value, offsetY: parseFloat(e.target.value) || 0 });
    },
    [value, onChange]
  );

  const handleBlurChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!value) return;
      onChange({ ...value, blur: parseFloat(e.target.value) || 0 });
    },
    [value, onChange]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      if (!value) return;
      onChange({ ...value, color });
    },
    [value, onChange]
  );

  return (
    <div className="shadow-editor">
      {/* Enable toggle */}
      <div className="shadow-row shadow-toggle-row">
        <label className="shadow-toggle">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={handleToggle}
          />
          <span className="shadow-toggle-label">Enable Shadow</span>
        </label>
      </div>

      {/* Presets */}
      {isEnabled && (
        <>
          <div className="shadow-row shadow-presets-row">
            <span className="shadow-label">Preset</span>
            <div className="shadow-presets">
              <button
                className="shadow-preset-btn"
                onClick={() => handlePreset('dropShadow')}
                title="Drop Shadow"
              >
                Drop
              </button>
              <button
                className="shadow-preset-btn"
                onClick={() => handlePreset('softShadow')}
                title="Soft Shadow"
              >
                Soft
              </button>
              <button
                className="shadow-preset-btn"
                onClick={() => handlePreset('glow')}
                title="Glow Effect"
              >
                Glow
              </button>
              <button
                className="shadow-preset-btn"
                onClick={() => handlePreset('subtleGlow')}
                title="Subtle Glow"
              >
                Subtle
              </button>
            </div>
          </div>

          {/* Offset X */}
          <div className="shadow-row">
            <span className="shadow-label">Offset X</span>
            <input
              type="number"
              className="shadow-input"
              value={value?.offsetX ?? 4}
              onChange={handleOffsetXChange}
              min={-50}
              max={50}
            />
            <span className="shadow-unit">px</span>
          </div>

          {/* Offset Y */}
          <div className="shadow-row">
            <span className="shadow-label">Offset Y</span>
            <input
              type="number"
              className="shadow-input"
              value={value?.offsetY ?? 4}
              onChange={handleOffsetYChange}
              min={-50}
              max={50}
            />
            <span className="shadow-unit">px</span>
          </div>

          {/* Blur */}
          <div className="shadow-row">
            <span className="shadow-label">Blur</span>
            <input
              type="range"
              className="shadow-slider"
              value={value?.blur ?? 8}
              onChange={handleBlurChange}
              min={0}
              max={50}
            />
            <span className="shadow-value">{value?.blur ?? 8}px</span>
          </div>

          {/* Color */}
          <CompactColorInput
            label="Color"
            value={value?.color ?? 'rgba(0, 0, 0, 0.3)'}
            onChange={handleColorChange}
          />
        </>
      )}
    </div>
  );
}
