import type { Player } from '@shared/types/game';
import { computeTotals } from '@shared/scoring';
import styles from './GameOver.module.css';

interface GameOverProps {
  players: Player[];
  winnerId: string;
  onPlayAgain?: () => void;
  onLeave?: () => void;
  isOnline?: boolean;
  isHost?: boolean;
}

export function GameOver({ players, winnerId, onPlayAgain, onLeave, isOnline, isHost }: GameOverProps) {
  const winner = players.find((p) => p.id === winnerId);
  const totals = players.map((p) => computeTotals(p.card));
  const sorted = players
    .map((p, i) => ({ player: p, total: totals[i].grand, idx: i }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.eyebrow}>게임 종료</div>
        <div className={styles.winner}>
          {winner ? (
            <>
              <div className={styles.winnerName}>{winner.name}</div>
              <div className={styles.winnerScore}>
                {computeTotals(winner.card).grand}점
              </div>
            </>
          ) : (
            <div className={styles.winnerName}>게임 종료</div>
          )}
        </div>

        <div className={styles.scores}>
          {sorted.map(({ player, total }, i) => (
            <div key={player.id} className={styles.scoreRow}>
              <span className={styles.rank}>#{i + 1}</span>
              <span className={styles.name}>{player.name}</span>
              <span className={styles.score}>{total}</span>
            </div>
          ))}
        </div>

        {isOnline ? (
          <div className={styles.btnRow}>
            {isHost ? (
              <button className={styles.playAgainBtn} onClick={onPlayAgain}>
                🔄 다시 하기
              </button>
            ) : (
              <div className={styles.waitingMsg}>호스트가 재시작하길 기다리는 중...</div>
            )}
            <button className={styles.leaveBtn} onClick={onLeave}>
              나가기
            </button>
          </div>
        ) : (
          <button className={styles.playAgainBtn} onClick={onPlayAgain}>
            다시 하기
          </button>
        )}
      </div>
    </div>
  );
}

export default GameOver;
