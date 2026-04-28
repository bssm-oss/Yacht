import { useGameStore } from './store/gameStore';
import { GameHeader } from './components/GameHeader/GameHeader';
import { Scoreboard } from './components/Scoreboard/Scoreboard';
import { Dice3D } from './components/Dice3D/Dice3D';
import { GameOver } from './components/GameOver/GameOver';
import { TweaksPanel, type Theme, type Mood } from './components/TweaksPanel/TweaksPanel';

import styles from './styles/layout.module.css';

function App() {
  const {
    gameState,
    rollSeed,
    theme,
    mood,
    playerCount,
    showHints,
    roll,
    toggleHold,
    pickCategory,
    newGame,
    renamePlayer,
    setPlayerCount,
    setTheme,
    setMood,
    setShowHints,
  } = useGameStore();

  const activePlayer = gameState.players[gameState.activePlayerIndex];

  return (
    <div className={styles.app} data-theme={theme} data-mood={mood}>
      <GameHeader
        playerName={activePlayer?.name ?? 'Player'}
        onPlayerNameChange={(name) => renamePlayer(gameState.activePlayerIndex, name)}
        rollsUsed={gameState.rollsUsed}
        onNewGame={newGame}
      />

      <main className={styles.main}>
        <div className={styles.gamePanel}>
          <Scoreboard
            players={gameState.players}
            activeIdx={gameState.activePlayerIndex}
            diceValues={gameState.dice}
            rollsUsed={gameState.rollsUsed}
            onPick={pickCategory}
            gameOver={gameState.phase === 'ended'}
          />

          <div className={styles.diceStage}>
            <Dice3D
              values={gameState.dice}
              held={gameState.held}
              onRollComplete={() => {}}
              onToggleHold={toggleHold}
              rollSeed={rollSeed}
            />

            <button
              className={styles.rollBtn}
              onClick={roll}
              disabled={gameState.held.length > 0 && gameState.held.every(Boolean)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              굴리기
            </button>

            {gameState.phase === 'ended' && (
              <GameOver
                players={gameState.players}
                winnerId={gameState.winnerId ?? ''}
                onPlayAgain={newGame}
              />
            )}
          </div>
        </div>
      </main>

      <div className={styles.tweaks}>
        <TweaksPanel
          theme={theme}
          mood={mood}
          playerCount={playerCount}
          showHints={showHints}
          onThemeChange={(t: Theme) => setTheme(t)}
          onMoodChange={(m: Mood) => setMood(m)}
          onPlayerCountChange={setPlayerCount}
          onShowHintsChange={setShowHints}
        />
      </div>
    </div>
  );
}

export default App;
