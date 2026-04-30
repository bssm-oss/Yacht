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
  /** Copy the room share URL to the clipboard */
  onCopyRoomLink?: () => void;
}

export function GameHeader({
  playerName,
  onPlayerNameChange,
  rollsUsed,
  isOnline = false,
  roomId,
  onNewGame,
  onLeave,
  onCopyRoomLink,
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
          <>
            <span className={styles.roomBadge}>방 코드: {roomId}</span>
            {onCopyRoomLink && (
              <button
                className={styles.copyLinkBtn}
                onClick={onCopyRoomLink}
                title="방 링크 복사"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                링크 복사
              </button>
            )}
          </>
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
