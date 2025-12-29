/**
 * Style Profile Settings component for the Settings modal.
 *
 * Contains settings for style profile behavior:
 * - Save icon style to profiles
 * - Save label style to profiles
 */

import { useSettingsStore } from '../../store/settingsStore';
import './StyleProfileSettings.css';

export function StyleProfileSettings() {
  const saveIconStyleToProfile = useSettingsStore((state) => state.saveIconStyleToProfile);
  const setSaveIconStyleToProfile = useSettingsStore((state) => state.setSaveIconStyleToProfile);
  const saveLabelStyleToProfile = useSettingsStore((state) => state.saveLabelStyleToProfile);
  const setSaveLabelStyleToProfile = useSettingsStore((state) => state.setSaveLabelStyleToProfile);

  return (
    <div className="style-profile-settings">
      <h3 className="settings-section-title">Style Profile Settings</h3>

      <p className="settings-description">
        Configure what properties are saved when creating a new style profile from a shape.
      </p>

      {/* Save Options */}
      <div className="settings-group">
        <h4 className="settings-group-title">Properties to Include</h4>

        <div className="settings-row settings-row-checkbox">
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={saveIconStyleToProfile}
              onChange={(e) => setSaveIconStyleToProfile(e.target.checked)}
            />
            <span className="settings-checkbox-text">Save Icon Style to Profile</span>
          </label>
          <span className="settings-hint">
            Include icon ID, size, and padding when saving a style profile
          </span>
        </div>

        <div className="settings-row settings-row-checkbox">
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={saveLabelStyleToProfile}
              onChange={(e) => setSaveLabelStyleToProfile(e.target.checked)}
            />
            <span className="settings-checkbox-text">Save Label Style to Profile</span>
          </label>
          <span className="settings-hint">
            Include label font size, color, background, and offset when saving a style profile
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="settings-info-box">
        <div className="settings-info-icon">i</div>
        <div className="settings-info-content">
          <strong>Note:</strong> These settings affect new profiles only. Existing profiles
          retain their saved properties regardless of these settings.
        </div>
      </div>
    </div>
  );
}
