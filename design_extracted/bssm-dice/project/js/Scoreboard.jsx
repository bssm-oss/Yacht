// Compact scoresheet — table form, integrated into the same panel as the dice tray.

window.Scoreboard = function Scoreboard({
  players, activeIdx, diceValues, rollsUsed, onPick, gameOver,
}) {
  const upper = window.YACHT_CATEGORIES.filter(c => c.section === "upper");
  const lower = window.YACHT_CATEGORIES.filter(c => c.section === "lower");
  const previewFor = (catId) => {
    const cat = window.YACHT_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.score(diceValues) : 0;
  };
  const totals = players.map(p => window.computeTotals(p.card));

  return (
    <aside className="scoresheet">
      <div className="ss-header">
        <div className="ss-title">Scoresheet</div>
        <div className="ss-sub">Tap a row to bank a roll</div>
      </div>
      <div className="ss-scroll">
        <table className="ss-table">
          <thead>
            <tr>
              <th></th>
              {players.map((p, i) => (
                <th key={i} className={`player-h ${i === activeIdx ? "is-active" : ""}`}>
                  <span className="player-h-name">{p.name}</span>
                  {i === activeIdx && !gameOver ? <span className="player-h-tag">Turn</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="ss-section-row"><th colSpan={players.length + 1}>Upper</th></tr>
            {upper.map(cat => (
              <Row key={cat.id} cat={cat} players={players} activeIdx={activeIdx}
                preview={previewFor(cat.id)} rollsUsed={rollsUsed} onPick={onPick} gameOver={gameOver} />
            ))}
            <tr className="ss-bonus-row">
              <td>
                <div className="ss-cat">
                  <div className="ss-cat-label">Bonus</div>
                  <div className="ss-cat-help">+35 if upper ≥ 63</div>
                </div>
              </td>
              {players.map((p, i) => {
                const t = totals[i];
                const got = t.bonus > 0;
                return (
                  <td key={i} className={`ss-cell ${got ? "is-bonus" : ""} ${i === activeIdx ? "is-active-col" : ""}`}>
                    <div className="bonus-bar">
                      <div className="bonus-fill" style={{ width: `${Math.min(100, (t.upper / 63) * 100)}%` }} />
                    </div>
                    <div className="bonus-num">{t.upper}/63</div>
                  </td>
                );
              })}
            </tr>
            <tr className="ss-section-row"><th colSpan={players.length + 1}>Lower</th></tr>
            {lower.map(cat => (
              <Row key={cat.id} cat={cat} players={players} activeIdx={activeIdx}
                preview={previewFor(cat.id)} rollsUsed={rollsUsed} onPick={onPick} gameOver={gameOver} />
            ))}
          </tbody>
          <tfoot>
            <tr className="ss-total-row">
              <td><div className="ss-total-label">Total</div></td>
              {totals.map((t, i) => (
                <td key={i} className={`ss-cell ss-total-cell ${i === activeIdx ? "is-active" : ""}`}>
                  <div className="ss-total-num">{t.grand}</div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </aside>
  );
};

function Row({ cat, players, activeIdx, preview, rollsUsed, onPick, gameOver }) {
  return (
    <tr>
      <td>
        <div className="ss-cat">
          <div className="ss-cat-label">{cat.label}</div>
          <div className="ss-cat-help">{cat.help}</div>
        </div>
      </td>
      {players.map((p, i) => {
        const v = p.card[cat.id];
        const isActive = i === activeIdx && !gameOver;
        const canPick = isActive && rollsUsed > 0 && v == null;
        const showPreview = isActive && rollsUsed > 0 && v == null;
        return (
          <td key={i}
            className={`ss-cell ${canPick ? "pickable" : ""} ${v != null ? "filled" : ""} ${isActive ? "is-active-col" : ""}`}
            onClick={canPick ? () => onPick(cat.id) : undefined}>
            {v != null
              ? <span>{v}</span>
              : showPreview
                ? <span className={`preview-num ${preview === 0 ? "is-zero" : ""}`}>{preview}</span>
                : <span className="empty-dash">—</span>}
          </td>
        );
      })}
    </tr>
  );
}
