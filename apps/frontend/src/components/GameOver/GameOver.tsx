import type { Player } from '@shared/types/game';
import { computeTotals } from '@shared/scoring';
import styles from './GameOver.module.css';

interface GameOverProps {
  players: Player[];
  winnerId: string;
  onPlayAgain?: () => void;
}

export function GameOver({ players, winnerId, onPlayAgain }: GameOverProps) {
  const winner = players.find((p) => p.id === winnerId);
  const totals = players.map((p) => computeTotals(p.card));
  const sorted = players
    .map((p, i) => ({ player: p, total: totals[i].grand, idx: i }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.eyebrow}>Game Over</div>
        <div className={styles.winner}>
          {winner ? (
            <>
              <div className={styles.winnerName}>{winner.name}</div>
              <div className={styles.winnerScore}>
                {computeTotals(winner.card).grand} points
              </div>
            </>
          ) : (
            <div className={styles.winnerName}>Game Over</div>
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

        <button className={styles.playAgainBtn} onClick={onPlayAgain}>
          Play again
        </button>
      </div>
    </div>
  );
}

export default GameOver;
