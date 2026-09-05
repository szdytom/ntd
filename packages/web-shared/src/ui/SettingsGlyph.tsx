import './SettingsGlyph.css';

export function SettingsGlyph() {
  return <span className="settings-glyph" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 2 20.66 7v10L12 22l-8.66-5V7Z" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  </span>;
}
