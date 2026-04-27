import { useState } from 'react';
import styles from './TweaksPanel.module.css';

export type Theme = 'light' | 'dark';
export type Mood = 'soft' | 'warm' | 'cool';

interface TweaksPanelProps {
  theme: Theme;
  mood: Mood;
  playerCount: number;
  showHints: boolean;
  onThemeChange?: (theme: Theme) => void;
  onMoodChange?: (mood: Mood) => void;
  onPlayerCountChange?: (count: number) => void;
  onShowHintsChange?: (show: boolean) => void;
}

export function TweaksPanel({
  theme,
  mood,
  playerCount,
  showHints,
  onThemeChange,
  onMoodChange,
  onPlayerCountChange,
  onShowHintsChange,
}: TweaksPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.container}>
      <button className={styles.toggle} onClick={() => setOpen(!open)} title="Settings">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.section}>
            <div className={styles.label}>Theme</div>
            <div className={styles.options}>
              {(['light', 'dark'] as Theme[]).map((t) => (
                <button
                  key={t}
                  className={`${styles.option} ${theme === t ? styles.active : ''}`}
                  onClick={() => onThemeChange?.(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.label}>Tray Mood</div>
            <div className={styles.options}>
              {(['soft', 'warm', 'cool'] as Mood[]).map((m) => (
                <button
                  key={m}
                  className={`${styles.option} ${mood === m ? styles.active : ''}`}
                  onClick={() => onMoodChange?.(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.label}>Players</div>
            <div className={styles.options}>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  className={`${styles.option} ${playerCount === n ? styles.active : ''}`}
                  onClick={() => onPlayerCountChange?.(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.toggleRow}>
              <span className={styles.label}>Hints</span>
              <button
                className={`${styles.switch} ${showHints ? styles.switchOn : ''}`}
                onClick={() => onShowHintsChange?.(!showHints)}
              >
                <span className={styles.switchKnob} />
              </button>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default TweaksPanel;
