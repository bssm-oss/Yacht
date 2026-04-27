// Yacht Dice — main app. Single unified panel: dice tray on the left,
// compact scoresheet table on the right. Player name + rolls live in header.

const { useState: useStateApp, useEffect: useEffectApp, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "playerCount": 1,
  "tableMood": "soft",
  "showHelp": true
}/*EDITMODE-END*/;

const PLAYER_NAME_DEFAULTS = ["Player 1", "Player 2", "Player 3", "Player 4"];
const rand1to6 = () => 1 + Math.floor(Math.random() * 6);
const newDice = () => [rand1to6(), rand1to6(), rand1to6(), rand1to6(), rand1to6()];

function useTweaksLocal(defaults) {
  const [tweaks, setTweaks] = useStateApp(defaults);
  const setTweak = useCallback((keyOrObj, val) => {
    setTweaks(prev => {
      const edits = typeof keyOrObj === "string" ? { [keyOrObj]: val } : keyOrObj;
      const next = { ...prev, ...edits };
      try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*"); } catch (e) {}
      return next;
    });
  }, []);
  return [tweaks, setTweak];
}

function App() {
  const [tweaks, setTweak] = useTweaksLocal(TWEAK_DEFAULTS);
  const playerCount = Math.max(1, Math.min(4, tweaks.playerCount || 1));
  const [players, setPlayers] = useStateApp(() =>
    Array.from({ length: playerCount }, (_, i) => ({
      name: PLAYER_NAME_DEFAULTS[i],
      card: window.makeEmptyScorecard(),
    }))
  );

  useEffectApp(() => {
    setPlayers(prev => {
      if (prev.length === playerCount) return prev;
      if (prev.length < playerCount) {
        const add = Array.from({ length: playerCount - prev.length }, (_, j) => ({
          name: PLAYER_NAME_DEFAULTS[prev.length + j],
          card: window.makeEmptyScorecard(),
        }));
        return [...prev, ...add];
      }
      return prev.slice(0, playerCount);
    });
    setActiveIdx(idx => Math.min(idx, playerCount - 1));
  }, [playerCount]);

  const [activeIdx, setActiveIdx] = useStateApp(0);
  const [dice, setDice] = useStateApp(() => newDice());
  const [held, setHeld] = useStateApp([false, false, false, false, false]);
  const [rollsUsed, setRollsUsed] = useStateApp(0);
  const [rolling, setRolling] = useStateApp(false);
  const [rollSeed, setRollSeed] = useStateApp(0);

  const gameOver = players.every(p => window.allFilled(p.card));

  const triggerRoll = useCallback(() => {
    if (rollsUsed >= 3 || rolling || gameOver) return;
    const next = dice.map((v, i) => held[i] ? v : rand1to6());
    setDice(next);
    setRolling(true);
    setRollSeed(s => s + 1);
  }, [dice, held, rollsUsed, rolling, gameOver]);

  const onRollComplete = useCallback(() => {
    setRolling(false);
    setRollsUsed(n => n + 1);
  }, []);

  const onToggleHold = useCallback((i) => {
    if (rollsUsed === 0 || rolling || gameOver) return;
    setHeld(h => { const n = h.slice(); n[i] = !n[i]; return n; });
  }, [rollsUsed, rolling, gameOver]);

  const pickCategory = useCallback((catId) => {
    if (rolling || rollsUsed === 0 || gameOver) return;
    const cat = window.YACHT_CATEGORIES.find(c => c.id === catId);
    if (!cat) return;
    const score = cat.score(dice);
    setPlayers(prev => prev.map((p, i) => i === activeIdx
      ? { ...p, card: { ...p.card, [catId]: score } } : p));
    setHeld([false, false, false, false, false]);
    setRollsUsed(0);
    setDice(newDice());
    setActiveIdx(i => (i + 1) % playerCount);
  }, [activeIdx, dice, rolling, rollsUsed, gameOver, playerCount]);

  const newGame = useCallback(() => {
    setPlayers(prev => prev.map((p, i) => ({
      name: p.name || PLAYER_NAME_DEFAULTS[i],
      card: window.makeEmptyScorecard(),
    })));
    setHeld([false, false, false, false, false]);
    setRollsUsed(0);
    setDice(newDice());
    setActiveIdx(0);
    setRolling(false);
  }, []);

  const renamePlayer = useCallback((i, name) => {
    setPlayers(prev => prev.map((p, j) => j === i ? { ...p, name } : p));
  }, []);

  useEffectApp(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.setAttribute("data-mood", tweaks.tableMood);
  }, [tweaks.theme, tweaks.tableMood]);

  const totals = players.map(p => window.computeTotals(p.card));
  const winnerIdx = gameOver
    ? totals.reduce((best, t, i) => t.grand > totals[best].grand ? i : best, 0)
    : -1;
  const activePlayer = players[activeIdx];
  const rollsLeft = 3 - rollsUsed;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-mark" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="20" height="20">
            <rect x="2" y="2" width="24" height="24" rx="6" fill="currentColor" opacity=".08" />
            <circle cx="9" cy="9" r="2" fill="currentColor" />
            <circle cx="19" cy="9" r="2" fill="currentColor" />
            <circle cx="14" cy="14" r="2" fill="currentColor" />
            <circle cx="9" cy="19" r="2" fill="currentColor" />
            <circle cx="19" cy="19" r="2" fill="currentColor" />
          </svg>
        </div>
        <div className="app-title">Yacht</div>
        <div className="app-meta-inline">
          <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end"}}>
            <span className="meta-eyebrow">Up next</span>
            <input
              className="meta-name"
              value={activePlayer?.name || ""}
              onChange={e => renamePlayer(activeIdx, e.target.value)}
              spellCheck={false}
              disabled={gameOver}
            />
          </div>
          <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4}}>
            <span className="meta-eyebrow">Rolls left</span>
            <div className="rolls-pips">
              {[0,1,2].map(i => (
                <span key={i} className={`rolls-pip ${i < rollsLeft ? "active" : ""}`} />
              ))}
            </div>
          </div>
          <button className="nav-btn" onClick={newGame}>New game</button>
        </div>
      </header>

      <main className="app-main">
        <div className="game-panel">
          <window.Scoreboard
            players={players}
            activeIdx={activeIdx}
            diceValues={dice}
            rollsUsed={rollsUsed}
            onPick={pickCategory}
            gameOver={gameOver}
          />

          <div className="dice-stage">
            <window.Dice3D
              values={dice}
              held={held}
              onRollComplete={onRollComplete}
              onCupClick={triggerRoll}
              onToggleHold={onToggleHold}
              theme={tweaks.theme}
              rollSeed={rollSeed}
            />
            {tweaks.showHelp && !rolling && !gameOver ? (
              <div className="hint-toast">
                {rollsUsed === 0
                  ? "Tap the cup to shake & roll"
                  : rollsLeft > 0
                    ? "Tap dice to hold · cup to roll the rest"
                    : "No rolls left — pick a category on the left"}
              </div>
            ) : null}
            {!rolling && !gameOver && rollsLeft > 0 ? (
              <div className="cup-cta">Cup<span className="cup-cta-arrow">→</span></div>
            ) : null}
            {gameOver ? (
              <div className="game-over-card">
                <div className="go-eyebrow">Game over</div>
                <div className="go-title">{players[winnerIdx].name} wins · {totals[winnerIdx].grand}</div>
                <div className="go-sub">
                  {totals.map((t, i) => (
                    <span key={i} className={`go-tally ${i === winnerIdx ? "is-winner" : ""}`}>
                      {players[i].name} {t.grand}
                    </span>
                  ))}
                </div>
                <button className="cta-blue" onClick={newGame}>Play again</button>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <YachtTweaks tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

function YachtTweaks({ tweaks, setTweak }) {
  const { TweaksPanel, TweakSection, TweakRadio, TweakSlider, TweakToggle } = window;
  if (!TweaksPanel) return null;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Theme">
        <TweakRadio label="Background" value={tweaks.theme}
          options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
          onChange={v => setTweak("theme", v)} />
        <TweakRadio label="Tray" value={tweaks.tableMood}
          options={[
            { value: "soft", label: "Soft" },
            { value: "warm", label: "Warm" },
            { value: "cool", label: "Cool" },
          ]}
          onChange={v => setTweak("tableMood", v)} />
      </TweakSection>
      <TweakSection title="Players">
        <TweakSlider label="Player count" value={tweaks.playerCount}
          min={1} max={4} step={1}
          onChange={v => setTweak("playerCount", v)} />
      </TweakSection>
      <TweakSection title="Hints">
        <TweakToggle label="Show inline tips" value={tweaks.showHelp}
          onChange={v => setTweak("showHelp", v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
