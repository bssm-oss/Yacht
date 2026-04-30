import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMultiplayerStore } from '../store/multiplayerStore';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { GameHeader } from '../components/GameHeader/GameHeader';
import { NewGameModal } from '../components/NewGameModal/NewGameModal';
import { TweaksPanel, type Theme, type Mood } from '../components/TweaksPanel/TweaksPanel';
import styles from '../styles/layout.module.css';
import lobbyStyles from './Lobby.module.css';

export function LobbyPage() {
  const navigate = useNavigate();
  const multiplayer = useMultiplayerStore();
  const local = useGameStore();
  const { user } = useAuthStore();

  const [showNewGame, setShowNewGame] = useState(false);
  const [newGameInitialTab, setNewGameInitialTab] = useState<'local' | 'online'>('local');

  const isOnline = multiplayer.connectionState === 'connected';

  // If already in an online room, redirect to the game page
  useEffect(() => {
    if (isOnline && multiplayer.roomId) {
      navigate(`/room/${multiplayer.roomId}`, { replace: true });
    }
  }, [isOnline, multiplayer.roomId, navigate]);

  // Auto-update player name from Google login
  useEffect(() => {
    if (user && !isOnline) {
      local.renamePlayer(0, user.name);
    }
  }, [user?.name, isOnline]);

  const handleStartLocal = (playerCount: number) => {
    local.setPlayerCount(playerCount);
    setShowNewGame(false);
    navigate('/room');
  };

  // Navigate to game once connected online
  useEffect(() => {
    if (multiplayer.connectionState === 'connected' && multiplayer.roomId) {
      setShowNewGame(false);
      navigate(`/room/${multiplayer.roomId}`);
    }
  }, [multiplayer.connectionState, multiplayer.roomId, navigate]);

  return (
    <div className={styles.app} data-theme={local.theme} data-mood={local.mood}>
      <GameHeader
        playerName={local.gameState.players[0]?.name ?? '플레이어'}
        onPlayerNameChange={(name) => local.renamePlayer(0, name)}
        rollsUsed={0}
        isOnline={false}
        onNewGame={() => {
          setNewGameInitialTab('local');
          setShowNewGame(true);
        }}
      />

      <main className={lobbyStyles.lobbyMain}>
        <div className={lobbyStyles.heroSection}>
          <h1 className={lobbyStyles.heroTitle}>BSSM Yacht Dice</h1>
          <p className={lobbyStyles.heroSubtitle}>친구들과 함께하는 요트 다이스 게임</p>

          <div className={lobbyStyles.actionButtons}>
            <button
              className={lobbyStyles.btnPrimary}
              onClick={() => {
                setNewGameInitialTab('local');
                setShowNewGame(true);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              새 게임 (로컬)
            </button>
            <button
              className={lobbyStyles.btnSecondary}
              onClick={() => {
                setNewGameInitialTab('online');
                setShowNewGame(true);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
              멀티플레이
            </button>
          </div>
        </div>

        <div className={lobbyStyles.boardPreview}>
          <div className={lobbyStyles.boardHeader}>
            <h2 className={lobbyStyles.boardTitle}>게시판</h2>
            <Link to="/board" className={lobbyStyles.boardMore}>전체 보기 →</Link>
          </div>
          <div className={lobbyStyles.boardList}>
            <div className={lobbyStyles.boardEmpty}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p>게시글이 없습니다</p>
            </div>
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
          initialTab={newGameInitialTab}
        />
      )}
    </div>
  );
}
