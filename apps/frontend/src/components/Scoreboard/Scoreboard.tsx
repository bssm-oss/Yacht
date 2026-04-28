import type { Player, Scorecard, DiceValue } from '@shared/types/game';
import { CATEGORY_SCORERS, computeTotals } from '@shared/scoring';
import { UPPER_CATEGORIES, LOWER_CATEGORIES } from '@shared/types/game';
import styles from './Scoreboard.module.css';

interface ScoreboardProps {
  players: Player[];
  activeIdx: number;
  diceValues: DiceValue[];
  rollsUsed: number;
  onPick?: (categoryId: keyof Scorecard) => void;
  gameOver?: boolean;
}

export function Scoreboard({ players, activeIdx, diceValues, rollsUsed, onPick, gameOver }: ScoreboardProps) {
  const totals = players.map((p) => computeTotals(p.card));

  const previewFor = (catId: keyof Scorecard): number => {
    return CATEGORY_SCORERS[catId](diceValues);
  };

  return (
    <aside className={styles.scoresheet}>
      <div className={styles.header}>
        <div className={styles.title}>점수표</div>
        <div className={styles.sub}>줄을 눌러서 점수 등록</div>
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              {players.map((p, i) => (
                <th
                  key={i}
                  className={`${styles.playerH} ${i === activeIdx ? styles.isActive : ''}`}
                >
                  <span className={styles.playerHName}>{p.name}</span>
                  {i === activeIdx && !gameOver ? <span className={styles.playerHTag}>진행 중</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className={styles.sectionRow}>
              <th colSpan={players.length + 1}>상단</th>
            </tr>
            {UPPER_CATEGORIES.map((cat) => (
              <Row
                key={cat}
                catId={cat}
                players={players}
                activeIdx={activeIdx}
                preview={previewFor(cat)}
                rollsUsed={rollsUsed}
                onPick={onPick}
                gameOver={gameOver}
              />
            ))}
            <tr className={styles.bonusRow}>
              <td>
                <div className={styles.cat}>
                  <div className={styles.catLabel}>보너스</div>
                  <div className={styles.catHelp}>상단 합계 63 이상 시 +35</div>
                </div>
              </td>
              {players.map((p, i) => {
                const t = totals[i];
                const got = t.bonus > 0;
                return (
                  <td
                    key={i}
                    className={`${styles.cell} ${got ? styles.isBonus : ''} ${i === activeIdx ? styles.isActiveCol : ''}`}
                  >
                    <div className={styles.bonusBar}>
                      <div
                        className={styles.bonusFill}
                        style={{ width: `${Math.min(100, (t.upper / 63) * 100)}%` }}
                      />
                    </div>
                    <div className={styles.bonusNum}>{t.upper}/63</div>
                  </td>
                );
              })}
            </tr>
            <tr className={styles.sectionRow}>
              <th colSpan={players.length + 1}>하단</th>
            </tr>
            {LOWER_CATEGORIES.map((cat) => (
              <Row
                key={cat}
                catId={cat}
                players={players}
                activeIdx={activeIdx}
                preview={previewFor(cat)}
                rollsUsed={rollsUsed}
                onPick={onPick}
                gameOver={gameOver}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td>
                <div className={styles.totalLabel}>합계</div>
              </td>
              {totals.map((t, i) => (
                <td
                  key={i}
                  className={`${styles.cell} ${styles.totalCell} ${i === activeIdx ? styles.isActive : ''}`}
                >
                  <div className={styles.totalNum}>{t.grand}</div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </aside>
  );
}

interface RowProps {
  catId: keyof Scorecard;
  players: Player[];
  activeIdx: number;
  preview: number;
  rollsUsed: number;
  onPick?: (categoryId: keyof Scorecard) => void;
  gameOver?: boolean;
}

const CATEGORY_LABELS: Record<keyof Scorecard, { label: string; help: string }> = {
  ones: { label: '1', help: '1이 나온 주사위 합' },
  twos: { label: '2', help: '2가 나온 주사위 합' },
  threes: { label: '3', help: '3이 나온 주사위 합' },
  fours: { label: '4', help: '4가 나온 주사위 합' },
  fives: { label: '5', help: '5가 나온 주사위 합' },
  sixes: { label: '6', help: '6이 나온 주사위 합' },
  choice: { label: '초이스', help: '전체 주사위 합' },
  fourkind: { label: '포 카인드', help: '같은 눈 4개 이상 → 4개 합' },
  fullhouse: { label: '풀하우스', help: '3+2 조합 → 전체 합' },
  sstraight: { label: '스몰 스트레이트', help: '연속 4개 → 15점' },
  lstraight: { label: '라지 스트레이트', help: '연속 5개 → 30점' },
  yacht: { label: '요트', help: '전부 같은 눈 → 50점' },
};

function Row({ catId, players, activeIdx, preview, rollsUsed, onPick, gameOver }: RowProps) {
  const cat = CATEGORY_LABELS[catId];

  return (
    <tr>
      <td>
        <div className={styles.cat}>
          <div className={styles.catLabel}>{cat.label}</div>
          <div className={styles.catHelp}>{cat.help}</div>
        </div>
      </td>
      {players.map((p, i) => {
        const v = p.card[catId];
        const isActive = i === activeIdx && !gameOver;
        const canPick = isActive && rollsUsed > 0 && v == null;
        const showPreview = isActive && rollsUsed > 0 && v == null;

        return (
          <td
            key={i}
            className={`${styles.cell} ${canPick ? styles.pickable : ''} ${v != null ? styles.filled : ''} ${
              isActive ? styles.isActiveCol : ''
            }`}
            onClick={canPick && onPick ? () => onPick(catId) : undefined}
          >
            {v != null ? (
              <span>{v}</span>
            ) : showPreview ? (
              <span className={`${styles.previewNum} ${preview === 0 ? styles.isZero : ''}`}>{preview}</span>
            ) : (
              <span className={styles.emptyDash}>—</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

export default Scoreboard;
