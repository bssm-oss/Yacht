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
        <div className={styles.title}>Scoresheet</div>
        <div className={styles.sub}>Tap a row to bank a roll</div>
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
                  {i === activeIdx && !gameOver ? <span className={styles.playerHTag}>Turn</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className={styles.sectionRow}>
              <th colSpan={players.length + 1}>Upper</th>
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
                  <div className={styles.catLabel}>Bonus</div>
                  <div className={styles.catHelp}>+35 if upper ≥ 63</div>
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
              <th colSpan={players.length + 1}>Lower</th>
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
                <div className={styles.totalLabel}>Total</div>
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
  ones: { label: 'Ones', help: 'Sum of all 1s' },
  twos: { label: 'Twos', help: 'Sum of all 2s' },
  threes: { label: 'Threes', help: 'Sum of all 3s' },
  fours: { label: 'Fours', help: 'Sum of all 4s' },
  fives: { label: 'Fives', help: 'Sum of all 5s' },
  sixes: { label: 'Sixes', help: 'Sum of all 6s' },
  choice: { label: 'Choice', help: 'Sum of all dice' },
  fourkind: { label: 'Four of a Kind', help: 'If ≥4 same, sum of those 4' },
  fullhouse: { label: 'Full House', help: 'Three + two — sum of all dice' },
  sstraight: { label: 'Small Straight', help: '4 in a row → 15' },
  lstraight: { label: 'Large Straight', help: '5 in a row → 30' },
  yacht: { label: 'Yacht', help: 'All 5 the same → 50' },
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
