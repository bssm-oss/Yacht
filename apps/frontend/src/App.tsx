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
              onCupClick={roll}
              onToggleHold={toggleHold}
              rollSeed={rollSeed}
            />

            {showHints && gameState.rollsUsed === 0 && gameState.phase === 'playing' && (
              <div className={styles.hint}>Tap the cup to shake & roll</div>
            )}

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
