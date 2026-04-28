import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from './store/gameStore';
import { useMultiplayerStore } from './store/multiplayerStore';
import { GameHeader } from './components/GameHeader/GameHeader';
import { Scoreboard } from './components/Scoreboard/Scoreboard';
import { Dice3D } from './components/Dice3D/Dice3D';
import { GameOver } from './components/GameOver/GameOver';
import { NewGameModal } from './components/NewGameModal/NewGameModal';
import { TweaksPanel, type Theme, type Mood } from './components/TweaksPanel/TweaksPanel';
import { WaitingRoom } from './components/WaitingRoom/WaitingRoom';
import { Chat } from './components/Chat/Chat';
import { CATEGORY_KEYS } from '@shared/types/game';
import { scoreCategory } from '@shared/scoring';

import styles from './styles/layout.module.css';

function App() {
  const local = useGameStore();
  const multiplayer = useMultiplayerStore();

  const [showNewGame, setShowNewGame] = useState(false);
  const [onlineRollSeed, setOnlineRollSeed] = useState(0);
  const prevOnlineRollsUsedRef = useRef(-1);

  const [turnAnnounce, setTurnAnnounce] = useState<{ name: string; hiding: boolean } | null>(null);
  const prevActiveIndexRef = useRef(-1);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TURN_LIMIT = 30;
  const [timeLeft, setTimeLeft] = useState(TURN_LIMIT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOnline = multiplayer.connectionState === 'connected';
  const { isSpectator, setReady, startGame, chatMessages, sendChat } = multiplayer;

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

  // 온라인 접속 완료 시 새 게임 모달 자동 닫기
  useEffect(() => {
    if (multiplayer.connectionState === 'connected') {
      setShowNewGame(false);
    }
  }, [multiplayer.connectionState]);

  const activePlayer = gameState.players[gameState.activePlayerIndex];

  const dismissTurnAnnounce = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setTurnAnnounce((prev) => prev ? { ...prev, hiding: true } : null);
    hideTimerRef.current = setTimeout(() => setTurnAnnounce(null), 300);
  }, []);

  // 턴이 바뀌면 알림 표시 (게임 시작 첫 턴 제외)
  useEffect(() => {
    const idx = gameState.activePlayerIndex;
    if (gameState.phase !== 'playing') {
      prevActiveIndexRef.current = idx;
      return;
    }
    if (prevActiveIndexRef.current === -1) {
      prevActiveIndexRef.current = idx;
      return;
    }
    if (prevActiveIndexRef.current !== idx) {
      prevActiveIndexRef.current = idx;
      const name = gameState.players[idx]?.name ?? '플레이어';
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setTurnAnnounce({ name, hiding: false });
      hideTimerRef.current = setTimeout(() => dismissTurnAnnounce(), 2200);
    }
  }, [gameState.activePlayerIndex, gameState.phase]);

  // 타이머 - 굴릴 때마다 리셋
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (gameState.phase !== 'playing') { setTimeLeft(TURN_LIMIT); return; }

    setTimeLeft(TURN_LIMIT);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.activePlayerIndex, gameState.phase, gameState.rollsUsed]);

  // 시간 초과 시 자동 처리: 점수 있는 카테고리 중 가장 높은 것 선택
  useEffect(() => {
    if (timeLeft !== 0 || gameState.phase !== 'playing') return;
    const player = gameState.players[gameState.activePlayerIndex];
    const emptyCats = CATEGORY_KEYS.filter((k) => player?.card[k] == null);
    if (emptyCats.length === 0) return;

    if (gameState.rollsUsed === 0) {
      // 굴리기 전이면 강제 굴리기만 - 타이머가 rollsUsed 변경으로 리셋되면 다음 만료 시 자동 선택
      handleRoll();
    } else {
      const nonZero = emptyCats.filter((k) => scoreCategory(k, gameState.dice) > 0);
      const pool = nonZero.length > 0 ? nonZero : emptyCats;
      const best = pool.reduce((b, k) =>
        scoreCategory(k, gameState.dice) >= scoreCategory(b, gameState.dice) ? k : b
      );
      handlePickCategory(best);
    }
  }, [timeLeft]);

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
            {gameState.phase === 'playing' && (
              <div
                className={styles.turnTimer}
                data-urgent={timeLeft <= 10 ? '' : undefined}
              >
                <svg viewBox="0 0 36 36" className={styles.timerRing}>
                  <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.8" className={styles.timerTrack} />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.8"
                    className={styles.timerProgress}
                    strokeDasharray={`${(timeLeft / TURN_LIMIT) * 100} 100`}
                    strokeDashoffset="0"
                    style={{ transition: timeLeft === TURN_LIMIT ? 'stroke 0.3s ease' : undefined }}
                  />
                </svg>
                <span className={styles.timerNum}>{timeLeft}</span>
              </div>
            )}

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

      {isOnline && (
        <Chat
          messages={chatMessages}
          playerId={multiplayer.playerId}
          onSend={sendChat}
        />
      )}

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

      {turnAnnounce && (
        <div
          className={`${styles.turnOverlay} ${turnAnnounce.hiding ? styles.hiding : ''}`}
          onClick={dismissTurnAnnounce}
        >
          <div className={styles.turnCard}>
            <h2>차례</h2>
            <p>{turnAnnounce.name}</p>
          </div>
        </div>
      )}

      {isOnline && gameState.phase === 'waiting' && (
        <WaitingRoom
          gameState={gameState}
          playerId={multiplayer.playerId}
          onReady={setReady}
          onStart={startGame}
          onLeave={handleLeave}
        />
      )}

      {isOnline && isSpectator && gameState.phase !== 'waiting' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 500,
          fontSize: '0.9rem',
        }}>
          <span>👁 관전 중 — {multiplayer.roomId}</span>
          <button
            onClick={handleLeave}
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.3rem 0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            나가기
          </button>
        </div>
      )}

      {multiplayer.connectionState === 'reconnecting' && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000,
          flexDirection: 'column', gap: '16px',
        }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid rgba(255,255,255,0.25)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ color: '#fff', fontFamily: 'var(--font-text)', fontSize: '16px', fontWeight: 600 }}>
            재접속 중...
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-text)', fontSize: '13px' }}>
            30초 내로 재접속되지 않으면 게임에서 제외됩니다
          </div>
          <button
            onClick={handleLeave}
            style={{
              background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px', padding: '8px 20px', cursor: 'pointer', marginTop: 8,
              fontFamily: 'var(--font-text)', fontSize: '13px', fontWeight: 600,
            }}
          >
            나가기
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
