import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useMultiplayerStore } from '../store/multiplayerStore';
import { useAuthStore } from '../store/authStore';
import { GameHeader } from '../components/GameHeader/GameHeader';
import { Scoreboard } from '../components/Scoreboard/Scoreboard';
import { Dice3D } from '../components/Dice3D/Dice3D';
import { GameOver } from '../components/GameOver/GameOver';
import { NewGameModal } from '../components/NewGameModal/NewGameModal';
import { TweaksPanel, type Theme, type Mood } from '../components/TweaksPanel/TweaksPanel';
import { WaitingRoom } from '../components/WaitingRoom/WaitingRoom';
import { Chat } from '../components/Chat/Chat';
import { CATEGORY_KEYS } from '@shared/types/game';
import { scoreCategory } from '@shared/scoring';

import styles from '../styles/layout.module.css';

export function GamePage() {
  const { roomId: urlRoomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const local = useGameStore();
  const multiplayer = useMultiplayerStore();
  const { user } = useAuthStore();

  const [showNewGame, setShowNewGame] = useState(false);
  const [newGameInitialTab, setNewGameInitialTab] = useState<'local' | 'online'>('local');
  const [onlineRollSeed, setOnlineRollSeed] = useState(0);
  const prevOnlineRollsUsedRef = useRef(-1);

  const [turnAnnounce, setTurnAnnounce] = useState<{ name: string; hiding: boolean } | null>(null);
  const prevActiveIndexRef = useRef(-1);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TURN_LIMIT = 30;
  const [timeLeft, setTimeLeft] = useState(TURN_LIMIT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [diceRolling, setDiceRolling] = useState(false);

  // 파워 게이지 상태
  const [rollPower, setRollPower] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const powerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const powerRef = useRef(0);

  const isOnline = multiplayer.connectionState === 'connected';
  const { isSpectator, setReady, startGame, chatMessages, sendChat, pendingRejoinModal, rejoin, spectate, restartRoom, kickPlayer } = multiplayer;

  // Use online game state when connected, local otherwise
  const gameState = isOnline ? (multiplayer.gameState ?? local.gameState) : local.gameState;
  const rollSeed = isOnline
    ? (multiplayer.gameState?.rollSeed ?? onlineRollSeed)
    : local.rollSeed;

  // Auto-reconnect: if URL has a roomId and we're not in that room, open the join modal
  const hasAttemptedJoin = useRef(false);
  useEffect(() => {
    if (
      urlRoomId &&
      !hasAttemptedJoin.current &&
      multiplayer.connectionState === 'disconnected' &&
      multiplayer.roomId === null
    ) {
      hasAttemptedJoin.current = true;
      // Pre-fill the room code and show the online modal
      setNewGameInitialTab('online');
      setShowNewGame(true);
    }
  }, [urlRoomId, multiplayer.connectionState, multiplayer.roomId]);

  // When we connect to a room, navigate to the correct URL
  useEffect(() => {
    if (isOnline && multiplayer.roomId) {
      const targetPath = `/room/${multiplayer.roomId}`;
      if (window.location.pathname !== targetPath) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [isOnline, multiplayer.roomId, navigate]);

  // When disconnected from a room (user left), navigate back to lobby
  useEffect(() => {
    if (
      !isOnline &&
      multiplayer.connectionState === 'disconnected' &&
      multiplayer.roomId === null &&
      urlRoomId &&
      hasAttemptedJoin.current &&
      !showNewGame
    ) {
      navigate('/', { replace: true });
    }
  }, [isOnline, multiplayer.connectionState, multiplayer.roomId, urlRoomId, showNewGame, navigate]);

  // Track roll start to suppress scoreboard preview during animation
  const prevRollSeedRef = useRef(rollSeed);
  useEffect(() => {
    if (prevRollSeedRef.current !== rollSeed) {
      prevRollSeedRef.current = rollSeed;
      setDiceRolling(true);
    }
  }, [rollSeed]);

  // Track online rolls to trigger dice animation (fallback when rollSeed is not set)
  useEffect(() => {
    if (!isOnline || !multiplayer.gameState) return;
    const current = multiplayer.gameState.rollsUsed;
    if (prevOnlineRollsUsedRef.current !== -1 && current > prevOnlineRollsUsedRef.current) {
      if (!multiplayer.gameState.rollSeed) {
        setOnlineRollSeed((s) => s + 1);
      }
    }
    prevOnlineRollsUsedRef.current = current;
  }, [multiplayer.gameState?.rollsUsed, multiplayer.gameState?.rollSeed, isOnline]);

  useEffect(() => {
    if (!isOnline) prevOnlineRollsUsedRef.current = -1;
  }, [isOnline]);

  // 온라인 접속 완료 시 새 게임 모달 자동 닫기
  useEffect(() => {
    if (multiplayer.connectionState === 'connected') {
      setShowNewGame(false);
    }
  }, [multiplayer.connectionState]);

  // 게임이 재시작(playing)되면 열려있는 로비 모달 자동 닫기
  useEffect(() => {
    if (isOnline && gameState.phase === 'playing' && showNewGame) {
      setShowNewGame(false);
    }
  }, [isOnline, gameState.phase, showNewGame]);

  // Google 로그인 후 플레이어 이름 자동 설정 (로컬 게임에서만)
  useEffect(() => {
    if (user && !isOnline) {
      local.renamePlayer(0, user.name);
    }
  }, [user?.name, isOnline]);

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

  const handleRoll = isOnline ? multiplayer.roll : local.roll;
  const handleToggleHold = isOnline ? multiplayer.hold : local.toggleHold;
  const handlePickCategory = isOnline ? multiplayer.pickCategory : local.pickCategory;

  // 시간 초과 시 자동 처리: 점수 있는 카테고리 중 가장 높은 것 선택
  useEffect(() => {
    if (timeLeft !== 0 || gameState.phase !== 'playing') return;
    const player = gameState.players[gameState.activePlayerIndex];
    const emptyCats = CATEGORY_KEYS.filter((k) => player?.card[k] == null);
    if (emptyCats.length === 0) return;

    if (gameState.rollsUsed === 0) {
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

  // 로컬 플레이: 물리 엔진 결과를 실제 주사위 값으로 반영
  const handlePhysicsResult = useCallback((physicsValues: import('@shared/types/game').DiceValue[]) => {
    if (!isOnline) {
      local.setDiceFromPhysics(physicsValues);
    }
  }, [isOnline, local]);

  // ── 파워 게이지 ──────────────────────────────────────────────
  const startPressing = useCallback(() => {
    if (diceRolling || allHeldRef.current) return;
    setIsPressing(true);
    powerRef.current = 0;
    setRollPower(0);
    if (powerTimerRef.current) clearInterval(powerTimerRef.current);
    powerTimerRef.current = setInterval(() => {
      powerRef.current = Math.min(1, powerRef.current + 0.025);
      setRollPower(powerRef.current);
      if (powerRef.current >= 1) {
        if (powerTimerRef.current) clearInterval(powerTimerRef.current);
      }
    }, 40);
  }, [diceRolling]);

  const releasePressing = useCallback(() => {
    if (!isPressing) return;
    if (powerTimerRef.current) clearInterval(powerTimerRef.current);
    setIsPressing(false);
    const power = powerRef.current;
    setRollPower(0);
    powerRef.current = 0;
    if (power >= 0.05) {
      handleRoll();
    }
  }, [isPressing, handleRoll]);

  const handleLeave = () => {
    multiplayer.disconnect();
    navigate('/', { replace: true });
  };

  // 게임 종료 후 다시 하기: 온라인이면 로비 모달을 열어 호스트가 재시작 가능하도록
  const handlePlayAgain = () => {
    if (isOnline && multiplayer.roomId) {
      setNewGameInitialTab('online');
      setShowNewGame(true);
    } else {
      setNewGameInitialTab('local');
      setShowNewGame(true);
    }
  };

  const handleStartLocal = (playerCount: number) => {
    local.setPlayerCount(playerCount);
    setShowNewGame(false);
  };

  const handleCopyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const allHeld = gameState.held.length > 0 && gameState.held.every(Boolean);
  const allHeldRef = useRef(allHeld);
  useEffect(() => { allHeldRef.current = allHeld; }, [allHeld]);

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
        onCopyRoomLink={isOnline ? handleCopyRoomLink : undefined}
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
            diceRolling={diceRolling}
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
              onRollComplete={() => setDiceRolling(false)}
              onPhysicsResult={handlePhysicsResult}
              onToggleHold={handleToggleHold}
              rollSeed={rollSeed}
              rollPower={rollPower > 0 ? rollPower : undefined}
            />

            {/* 파워 게이지 굴리기 버튼 */}
            <div className={styles.rollArea}>
              {isPressing && (
                <div className={styles.powerGauge}>
                  <div
                    className={styles.powerFill}
                    style={{
                      width: `${rollPower * 100}%`,
                      background: rollPower < 0.4
                        ? '#34c759'
                        : rollPower < 0.75
                          ? '#ff9500'
                          : '#ff3b30',
                    }}
                  />
                  <span className={styles.powerLabel}>
                    {rollPower < 0.4 ? '약' : rollPower < 0.75 ? '보통' : '강'}
                  </span>
                </div>
              )}
              <button
                className={`${styles.rollBtn} ${isPressing ? styles.rollBtnPressing : ''}`}
                onPointerDown={startPressing}
                onPointerUp={releasePressing}
                onPointerLeave={releasePressing}
                disabled={allHeld || diceRolling}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isPressing ? '놓아서 굴리기' : '꾹 눌러서 굴리기'}
              </button>
            </div>

            {gameState.phase === 'ended' && (
              <GameOver
                players={gameState.players}
                winnerId={gameState.winnerId ?? ''}
                onPlayAgain={handlePlayAgain}
                onLeave={isOnline ? handleLeave : undefined}
                isOnline={isOnline}
                isHost={!multiplayer.roomId || gameState.hostId === multiplayer.playerId}
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
          initialTab={newGameInitialTab}
          prefillRoomCode={urlRoomId}
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
          onKick={kickPlayer}
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

      {pendingRejoinModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--hairline)',
            borderRadius: '16px',
            padding: '28px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            minWidth: '280px',
          }}>
            <div style={{ fontFamily: 'var(--font-text)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              게임 진행 중
            </div>
            <div style={{ fontFamily: 'var(--font-text)', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              재접속하시겠습니까, 아니면 관전하시겠습니까?
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                onClick={rejoin}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'var(--color-apple-blue)', color: '#fff',
                  border: 'none', borderRadius: '10px', cursor: 'pointer',
                  fontFamily: 'var(--font-text)', fontSize: '14px', fontWeight: 600,
                }}
              >
                재참가
              </button>
              <button
                onClick={spectate}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  border: '1px solid var(--hairline)', borderRadius: '10px', cursor: 'pointer',
                  fontFamily: 'var(--font-text)', fontSize: '14px', fontWeight: 600,
                }}
              >
                관전하기
              </button>
            </div>
          </div>
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
