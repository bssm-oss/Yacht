import { useState, useEffect, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import { useMultiplayerStore } from './store/multiplayerStore';
import { GameHeader } from './components/GameHeader/GameHeader';
import { Scoreboard } from './components/Scoreboard/Scoreboard';
import { Dice3D } from './components/Dice3D/Dice3D';
import { GameOver } from './components/GameOver/GameOver';
import { NewGameModal } from './components/NewGameModal/NewGameModal';
import { TweaksPanel, type Theme, type Mood } from './components/TweaksPanel/TweaksPanel';

import styles from './styles/layout.module.css';

function App() {
  const local = useGameStore();
  const multiplayer = useMultiplayerStore();

  const [showNewGame, setShowNewGame] = useState(false);
  const [onlineRollSeed, setOnlineRollSeed] = useState(0);
  const prevOnlineRollsUsedRef = useRef(-1);

  const isOnline = multiplayer.connectionState === 'connected';

  // Use online game state when connected, local otherwise
  const gameState = isOnline ? (multiplayer.gameState ?? local.gameState) : local.gameState;
  const rollSeed = isOnline ? onlineRollSeed : local.rollSeed;

  // Track online rolls to trigger dice animation
  useEffect(() => {
    if (!isOnline || !multiplayer.gameState) return;
    const current = multiplayer.gameState.rollsUsed;
    if (prevOnlineRollsUsedRef.current !== -1 && current > prevOnlineRollsUsedRef.current) {
      setOnlineRollSeed((s) => s + 1);
    }
    prevOnlineRollsUsedRef.current = current;
  }, [multiplayer.gameState?.rollsUsed, isOnline]);

  useEffect(() => {
    if (!isOnline) prevOnlineRollsUsedRef.current = -1;
  }, [isOnline]);

  const activePlayer = gameState.players[gameState.activePlayerIndex];

  const handleRoll = isOnline ? multiplayer.roll : local.roll;
  const handleToggleHold = isOnline ? multiplayer.hold : local.toggleHold;
  const handlePickCategory = isOnline ? multiplayer.pickCategory : local.pickCategory;

  const handleLeave = () => {
    multiplayer.disconnect();
  };

  const handleStartLocal = (playerCount: number) => {
    local.setPlayerCount(playerCount);
    setShowNewGame(false);
  };

  const allHeld = gameState.held.length > 0 && gameState.held.every(Boolean);

  return (
    <div className={styles.app} data-theme={local.theme} data-mood={local.mood}>
      <GameHeader
        playerName={activePlayer?.name ?? '플레이어'}
        onPlayerNameChange={(name) => local.renamePlayer(gameState.activePlayerIndex, name)}
        rollsUsed={gameState.rollsUsed}
        isOnline={isOnline}
        roomId={multiplayer.roomId}
        onNewGame={() => setShowNewGame(true)}
        onLeave={handleLeave}
      />

      <main className={styles.main}>
        <div className={styles.gamePanel}>
          <Scoreboard
            players={gameState.players}
            activeIdx={gameState.activePlayerIndex}
            diceValues={gameState.dice}
            rollsUsed={gameState.rollsUsed}
            onPick={handlePickCategory}
            gameOver={gameState.phase === 'ended'}
          />

          <div className={styles.diceStage}>
            <Dice3D
              values={gameState.dice}
              held={gameState.held}
              onRollComplete={() => {}}
              onToggleHold={handleToggleHold}
              rollSeed={rollSeed}
            />

            <button
              className={styles.rollBtn}
              onClick={handleRoll}
              disabled={allHeld}
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
                onPlayAgain={() => setShowNewGame(true)}
              />
            )}
          </div>
        </div>
      </main>

      <div className={styles.tweaks}>
        <TweaksPanel
          theme={local.theme}
          mood={local.mood}
          playerCount={local.playerCount}
          showHints={local.showHints}
          onThemeChange={(t: Theme) => local.setTheme(t)}
          onMoodChange={(m: Mood) => local.setMood(m)}
          onPlayerCountChange={local.setPlayerCount}
          onShowHintsChange={local.setShowHints}
        />
      </div>

      {showNewGame && (
        <NewGameModal
          onStartLocal={handleStartLocal}
          onClose={() => setShowNewGame(false)}
        />
      )}
    </div>
  );
}

export default App;
