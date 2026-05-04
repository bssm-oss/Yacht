import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../store/multiplayerStore';
import { useGameStore } from '../store/gameStore';
import { useAuthStore, BACKEND_URL } from '../store/authStore';
import type { RoomInfo } from '@shared/types/ws';
import styles from './Lobby.module.css';

type NavTab = 'rooms' | 'create' | 'history';

export function LobbyPage() {
  const navigate = useNavigate();
  const multiplayer = useMultiplayerStore();
  const local = useGameStore();
  const { user, logout } = useAuthStore();

  const [tab, setTab] = useState<NavTab>('rooms');
  const [guestName, setGuestName] = useState('');
  const [createMode, setCreateMode] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPublic, setIsPublic] = useState(true);

  const isOnline = multiplayer.connectionState === 'connected';
  const playerName = user?.name ?? guestName;

  useEffect(() => {
    if (isOnline && multiplayer.roomId) {
      navigate(`/room/${multiplayer.roomId}`, { replace: true });
    }
  }, [isOnline, multiplayer.roomId, navigate]);

  const refreshRooms = useCallback(() => {
    multiplayer.fetchPublicRooms();
  }, [multiplayer]);

  useEffect(() => {
    if (tab !== 'rooms') return;
    refreshRooms();
    const id = setInterval(refreshRooms, 5000);
    return () => clearInterval(id);
  }, [tab, refreshRooms]);

  const handleCreate = async () => {
    if (!playerName.trim()) return;
    await multiplayer.createRoom(playerName.trim(), maxPlayers, isPublic);
  };

  const handleJoinByCode = async () => {
    if (!playerName.trim() || roomCode.trim().length < 4) return;
    await multiplayer.joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!playerName.trim()) return;
    await multiplayer.joinRoom(roomId, playerName.trim());
  };

  return (
    <div className={styles.layout} data-theme={local.theme} data-mood={local.mood}>
      {/* ── Left nav sidebar ── */}
      <aside className={styles.navSidebar}>
        <div className={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="8" width="20" height="14" rx="3" />
            <circle cx="8" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="15" r="1" fill="currentColor" />
            <circle cx="16" cy="12" r="1" fill="currentColor" />
          </svg>
          <span className={styles.logoText}>Yacht Dice</span>
        </div>

        <nav className={styles.navItems}>
          <button
            className={`${styles.navBtn} ${tab === 'rooms' ? styles.navBtnActive : ''}`}
            onClick={() => setTab('rooms')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            게임 목록
          </button>
          <button
            className={`${styles.navBtn} ${tab === 'create' ? styles.navBtnActive : ''}`}
            onClick={() => setTab('create')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            새 게임
          </button>
          <button
            className={`${styles.navBtn} ${tab === 'history' ? styles.navBtnActive : ''}`}
            onClick={() => setTab('history')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            전적
          </button>
        </nav>

        <div className={styles.navFooter}>
          {user ? (
            <div className={styles.userCard}>
              <img className={styles.userAvatar} src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
              <div className={styles.userMeta}>
                <span className={styles.userName}>{user.name}</span>
                <button className={styles.logoutBtn} onClick={logout}>로그아웃</button>
              </div>
            </div>
          ) : (
            <a className={styles.loginBtn} href={`${BACKEND_URL}/auth/google`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google 로그인
            </a>
          )}
        </div>
      </aside>

      {/* ── Center content ── */}
      <main className={styles.content}>
        {tab === 'rooms' && (
          <RoomsPanel
            rooms={multiplayer.publicRooms}
            playerName={playerName}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            isLoggedIn={!!user}
            onJoin={handleJoinRoom}
            onRefresh={refreshRooms}
            connecting={multiplayer.connectionState === 'connecting'}
            error={multiplayer.error}
          />
        )}
        {tab === 'create' && (
          <CreatePanel
            mode={createMode}
            onModeChange={setCreateMode}
            playerName={playerName}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            isLoggedIn={!!user}
            roomCode={roomCode}
            onRoomCodeChange={setRoomCode}
            maxPlayers={maxPlayers}
            onMaxPlayersChange={setMaxPlayers}
            isPublic={isPublic}
            onIsPublicChange={setIsPublic}
            onCreate={handleCreate}
            onJoin={handleJoinByCode}
            connecting={multiplayer.connectionState === 'connecting'}
            error={multiplayer.error}
          />
        )}
        {tab === 'history' && <HistoryPanel isLoggedIn={!!user} />}
      </main>

      {/* ── Right friends sidebar ── */}
      <aside className={styles.friendsSidebar}>
        <div className={styles.friendsHeader}>
          <span className={styles.friendsTitle}>친구</span>
          <span className={styles.friendsBadge}>0</span>
        </div>
        <div className={styles.friendsBody}>
          {user ? (
            <div className={styles.friendsEmpty}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              <p>친구 기능 준비 중</p>
            </div>
          ) : (
            <div className={styles.friendsEmpty}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              <p>로그인하면<br />친구와 함께 플레이</p>
              <a className={styles.friendsLoginBtn} href={`${BACKEND_URL}/auth/google`}>로그인</a>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Rooms Panel
────────────────────────────────────────────── */
interface RoomsPanelProps {
  rooms: RoomInfo[];
  playerName: string;
  guestName: string;
  onGuestNameChange: (v: string) => void;
  isLoggedIn: boolean;
  onJoin: (roomId: string) => void;
  onRefresh: () => void;
  connecting: boolean;
  error: string | null;
}

function RoomsPanel({ rooms, playerName, guestName, onGuestNameChange, isLoggedIn, onJoin, onRefresh, connecting, error }: RoomsPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>게임 목록</h2>
        <button className={styles.refreshBtn} onClick={onRefresh} title="새로고침">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      {!isLoggedIn && (
        <div className={styles.guestNameRow}>
          <input
            className={styles.nameInput}
            placeholder="닉네임 입력"
            value={guestName}
            onChange={(e) => onGuestNameChange(e.target.value)}
            maxLength={20}
          />
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.roomList}>
        {rooms.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.3">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <p>진행 중인 공개방이 없습니다</p>
          </div>
        ) : (
          rooms.map((room) => (
            <RoomCard
              key={room.roomId}
              room={room}
              canJoin={!!playerName.trim()}
              onJoin={() => onJoin(room.roomId)}
              connecting={connecting}
            />
          ))
        )}
      </div>
    </div>
  );
}

function RoomCard({ room, canJoin, onJoin, connecting }: { room: RoomInfo; canJoin: boolean; onJoin: () => void; connecting: boolean }) {
  const isWaiting = room.phase === 'waiting';
  const isFull = room.playerCount >= room.maxPlayers;
  const joinable = isWaiting && !isFull && canJoin && !connecting;

  return (
    <div className={styles.roomCard}>
      <div className={styles.roomCardLeft}>
        <div className={styles.roomCardHost}>{room.hostName}의 방</div>
        <div className={styles.roomCardCode}>{room.roomId}</div>
      </div>
      <div className={styles.roomCardMid}>
        <span className={`${styles.roomStatus} ${isWaiting ? styles.roomStatusWaiting : styles.roomStatusPlaying}`}>
          {isWaiting ? '대기 중' : '게임 중'}
        </span>
        <span className={styles.roomPlayers}>
          {room.playerCount} / {room.maxPlayers}명
        </span>
      </div>
      <button
        className={`${styles.joinBtn} ${!isWaiting ? styles.joinBtnSpectate : ''}`}
        onClick={onJoin}
        disabled={!joinable && isWaiting}
      >
        {connecting ? '…' : isWaiting ? (isFull ? '가득 참' : '참가') : '관전'}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Create Panel
────────────────────────────────────────────── */
interface CreatePanelProps {
  mode: 'create' | 'join';
  onModeChange: (m: 'create' | 'join') => void;
  playerName: string;
  guestName: string;
  onGuestNameChange: (v: string) => void;
  isLoggedIn: boolean;
  roomCode: string;
  onRoomCodeChange: (v: string) => void;
  maxPlayers: number;
  onMaxPlayersChange: (n: number) => void;
  isPublic: boolean;
  onIsPublicChange: (v: boolean) => void;
  onCreate: () => void;
  onJoin: () => void;
  connecting: boolean;
  error: string | null;
}

function CreatePanel({ mode, onModeChange, playerName, guestName, onGuestNameChange, isLoggedIn, roomCode, onRoomCodeChange, maxPlayers, onMaxPlayersChange, isPublic, onIsPublicChange, onCreate, onJoin, connecting, error }: CreatePanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>새 게임</h2>
      </div>

      <div className={styles.modeTabs}>
        <button className={`${styles.modeTab} ${mode === 'create' ? styles.modeTabActive : ''}`} onClick={() => onModeChange('create')}>방 만들기</button>
        <button className={`${styles.modeTab} ${mode === 'join' ? styles.modeTabActive : ''}`} onClick={() => onModeChange('join')}>코드 참가</button>
      </div>

      <div className={styles.createForm}>
        {!isLoggedIn && (
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>닉네임</label>
            <input
              className={styles.nameInput}
              placeholder="이름을 입력하세요"
              value={guestName}
              onChange={(e) => onGuestNameChange(e.target.value)}
              maxLength={20}
            />
          </div>
        )}

        {mode === 'create' && (
          <>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>최대 인원</label>
              <div className={styles.optionRow}>
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    className={`${styles.optionBtn} ${maxPlayers === n ? styles.optionBtnActive : ''}`}
                    onClick={() => onMaxPlayersChange(n)}
                  >
                    {n}명
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>공개 여부</label>
              <div className={styles.optionRow}>
                <button className={`${styles.optionBtn} ${isPublic ? styles.optionBtnActive : ''}`} onClick={() => onIsPublicChange(true)}>공개</button>
                <button className={`${styles.optionBtn} ${!isPublic ? styles.optionBtnActive : ''}`} onClick={() => onIsPublicChange(false)}>비공개</button>
              </div>
            </div>
          </>
        )}

        {mode === 'join' && (
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>방 코드</label>
            <input
              className={`${styles.nameInput} ${styles.codeInput}`}
              placeholder="XXXX"
              value={roomCode}
              onChange={(e) => onRoomCodeChange(e.target.value.toUpperCase())}
              maxLength={4}
              onKeyDown={(e) => e.key === 'Enter' && onJoin()}
            />
          </div>
        )}

        {error && <div className={styles.errorBanner}>{error}</div>}

        <button
          className={styles.primaryBtn}
          onClick={mode === 'create' ? onCreate : onJoin}
          disabled={connecting || !playerName.trim() || (mode === 'join' && roomCode.trim().length < 4)}
        >
          {connecting ? '연결 중…' : mode === 'create' ? '방 만들기' : '참가하기'}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   History Panel
────────────────────────────────────────────── */
function HistoryPanel({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>전적</h2>
      </div>
      <div className={styles.emptyState}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.3">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <p>{isLoggedIn ? '전적 기능 준비 중입니다' : '로그인 후 전적을 확인할 수 있습니다'}</p>
      </div>
    </div>
  );
}
