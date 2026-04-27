import styles from './GameHeader.module.css';

interface GameHeaderProps {
  playerName: string;
  onPlayerNameChange?: (name: string) => void;
  rollsUsed: number;
  onNewGame?: () => void;
}

export function GameHeader({ playerName, onPlayerNameChange, rollsUsed, onNewGame }: GameHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9" />
            <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.3" />
          </svg>
          <span className={styles.title}>Yacht</span>
        </div>
      </div>

      <div className={styles.center}>
        <input
          type="text"
          className={styles.playerInput}
          value={playerName}
          onChange={(e) => onPlayerNameChange?.(e.target.value)}
          placeholder="Player name"
        />
        <div className={styles.pips}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`${styles.pip} ${i < rollsUsed ? styles.active : ''}`} />
          ))}
        </div>
      </div>

      <div className={styles.right}>
        <button className={styles.newGameBtn} onClick={onNewGame}>
          New game
        </button>
      </div>
    </header>
  );
}

export default GameHeader;
