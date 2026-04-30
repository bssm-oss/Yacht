import styles from './GameHeader.module.css';
import { UserMenu } from '../Auth/UserMenu';

interface GameHeaderProps {
  playerName: string;
  onPlayerNameChange?: (name: string) => void;
  rollsUsed: number;
  isOnline?: boolean;
  roomId?: string | null;
  onNewGame?: () => void;
  onLeave?: () => void;
}

export function GameHeader({
  playerName,
  onPlayerNameChange,
  rollsUsed,
  isOnline = false,
  roomId,
  onNewGame,
  onLeave,
}: GameHeaderProps) {

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
          <span className={styles.title}>BSSM-Yacht</span>
        </div>
        {isOnline && roomId && (
          <span className={styles.roomBadge}>방 코드: {roomId}</span>
        )}
      </div>

      <div className={styles.center}>
        <input
          type="text"
          className={styles.playerInput}
          value={playerName}
          onChange={(e) => onPlayerNameChange?.(e.target.value)}
          placeholder="플레이어 이름"
          disabled={isOnline}
        />
        <div className={styles.pips}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`${styles.pip} ${i < rollsUsed ? styles.active : ''}`} />
          ))}
        </div>
      </div>

      <div className={styles.right}>
        {isOnline ? (
          <button className={styles.leaveBtn} onClick={onLeave}>
            나가기
          </button>
        ) : (
          <button className={styles.newGameBtn} onClick={onNewGame}>
            새 게임
          </button>
        )}
        {/* OAuth 유저 메뉴 */}
        <UserMenu />
      </div>
    </header>
  );
}


export default GameHeader;
