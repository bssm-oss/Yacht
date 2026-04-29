import type { GameState } from '@shared/types/game';
import styles from './WaitingRoom.module.css';

interface WaitingRoomProps {
  gameState: GameState;
  playerId: string | null;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
  onKick?: (targetId: string) => void;
}

export function WaitingRoom({ gameState, playerId, onReady, onStart, onLeave, onKick }: WaitingRoomProps) {
  const isHost = gameState.hostId === playerId;
  const me = gameState.players.find((p) => p.id === playerId);
  const connectedPlayers = gameState.players.filter((p) => p.connected);
  const allReady = connectedPlayers.length >= 2 && connectedPlayers.every((p) => p.ready);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameState.roomId).catch(() => {});
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2 className={styles.title}>대기실</h2>

        <div className={styles.roomCodeSection}>
          <span className={styles.roomCodeLabel}>방 코드</span>
          <button className={styles.roomCode} onClick={handleCopyCode} title="클릭하여 복사">
            {gameState.roomId}
          </button>
        </div>

        <div className={styles.playerCountLine}>
          {connectedPlayers.length} / {gameState.maxPlayers}명
        </div>

        <ul className={styles.playerList}>
          {connectedPlayers.map((player) => (
            <li key={player.id} className={styles.playerRow}>
              <span className={styles.playerName}>
                {player.name}
                {player.id === gameState.hostId && (
                  <span className={styles.hostBadge}>방장</span>
                )}
              </span>
              <div className={styles.playerRowRight}>
                <span
                  className={`${styles.readyBadge} ${player.ready ? styles.readyBadgeGreen : styles.readyBadgeGray}`}
                >
                  {player.ready ? '준비완료' : '대기중'}
                </span>
                {isHost && player.id !== playerId && onKick && (
                  <button
                    className={styles.kickBtn}
                    onClick={() => onKick(player.id)}
                    title="강퇴"
                  >
                    강퇴
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${me?.ready ? styles.btnSecondary : styles.btnPrimary}`}
            onClick={() => onReady(!me?.ready)}
          >
            {me?.ready ? '준비 취소' : '준비'}
          </button>

          {isHost && (
            <button
              className={`${styles.btn} ${styles.btnStart}`}
              onClick={onStart}
              disabled={!allReady}
              title={!allReady ? '모든 플레이어가 준비해야 합니다' : undefined}
            >
              게임 시작
            </button>
          )}

          <button
            className={`${styles.btn} ${styles.btnLeave}`}
            onClick={onLeave}
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}
