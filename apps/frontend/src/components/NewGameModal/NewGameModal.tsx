import { useState, useEffect, useRef } from 'react';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import type { RoomInfo } from '@shared/types/ws';
import styles from './NewGameModal.module.css';

interface NewGameModalProps {
  onStartLocal: (playerCount: number) => void;
  onClose: () => void;
  initialTab?: 'local' | 'online';
}

export function NewGameModal({ onStartLocal, onClose, initialTab = 'local' }: NewGameModalProps) {
  const [tab, setTab] = useState<'local' | 'online'>(initialTab);
  const [playerCount, setPlayerCount] = useState(1);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [onlineTab, setOnlineTab] = useState<'create' | 'join' | 'browse'>('create');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPublic, setIsPublic] = useState(true);

  const { createRoom, joinRoom, disconnect, restartRoom, roomId, playerId, connectionState, error, fetchPublicRooms, publicRooms, gameState } =
    useMultiplayerStore();

  const isConnected = connectionState === 'connected' && roomId;

  useEffect(() => {
    if (onlineTab === 'browse') {
      fetchPublicRooms();
    }
  }, [onlineTab, fetchPublicRooms]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) return;
    await createRoom(playerName.trim(), maxPlayers, isPublic);
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || roomCode.trim().length < 4) return;
    await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
  };

  const handleJoinFromBrowse = async (targetRoomId: string) => {
    if (!playerName.trim()) {
      nameInputRef.current?.focus();
      return;
    }
    await joinRoom(targetRoomId, playerName.trim());
  };

  const handleCopyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveRoom = () => {
    disconnect();
    onClose();
  };

  return (
    <div className={styles.overlay} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${tab === 'online' && onlineTab === 'browse' && !isConnected ? styles.modalWide : ''}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>새 게임</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'local' ? styles.tabActive : ''}`}
            onClick={() => setTab('local')}
          >
            로컬
          </button>
          <button
            className={`${styles.tab} ${tab === 'online' ? styles.tabActive : ''}`}
            onClick={() => setTab('online')}
          >
            온라인
          </button>
        </div>

        {tab === 'local' ? (
          <div className={styles.content}>
            <div className={styles.field}>
              <div className={styles.label}>플레이어 수</div>
              <div className={styles.options}>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    className={`${styles.option} ${playerCount === n ? styles.optionActive : ''}`}
                    onClick={() => setPlayerCount(n)}
                  >
                    {n}명
                  </button>
                ))}
              </div>
            </div>
            <button className={styles.primaryBtn} onClick={() => onStartLocal(playerCount)}>
              시작하기
            </button>
          </div>
        ) : (
          <div className={styles.content}>
            {isConnected ? (
              <div className={styles.roomConnected}>
                <div className={styles.label}>방 코드</div>
                <div className={styles.roomCode} onClick={handleCopyCode}>
                  {roomId}
                  <span className={styles.copyHint}>{copied ? '복사됨!' : '클릭해서 복사'}</span>
                </div>
                <div className={styles.connectedBadge}>연결됨 ✓</div>
                <div className={styles.btnRow}>
                  {gameState?.phase === 'ended' && gameState?.hostId === playerId ? (
                    <button className={styles.primaryBtn} onClick={() => { restartRoom(); }}>
                      🔄 새 게임 시작
                    </button>
                  ) : (
                    <button className={styles.primaryBtn} onClick={onClose}>
                      게임으로
                    </button>
                  )}
                  <button className={styles.dangerBtn} onClick={handleLeaveRoom}>
                    방 나가기
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.onlineTabs}>
                  <button
                    className={`${styles.onlineTab} ${onlineTab === 'create' ? styles.onlineTabActive : ''}`}
                    onClick={() => setOnlineTab('create')}
                  >
                    방 만들기
                  </button>
                  <button
                    className={`${styles.onlineTab} ${onlineTab === 'join' ? styles.onlineTabActive : ''}`}
                    onClick={() => setOnlineTab('join')}
                  >
                    코드 참가
                  </button>
                  <button
                    className={`${styles.onlineTab} ${onlineTab === 'browse' ? styles.onlineTabActive : ''}`}
                    onClick={() => setOnlineTab('browse')}
                  >
                    방 찾기
                  </button>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>내 이름</label>
                  <input
                    ref={nameInputRef}
                    className={styles.input}
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    maxLength={20}
                    onKeyDown={(e) => e.key === 'Enter' && (onlineTab === 'create' ? handleCreateRoom() : onlineTab === 'join' ? handleJoinRoom() : undefined)}
                  />
                </div>

                {onlineTab === 'create' && (
                  <>
                    <div className={styles.field}>
                      <div className={styles.label}>최대 인원</div>
                      <div className={styles.options}>
                        {[2, 3, 4].map((n) => (
                          <button
                            key={n}
                            className={`${styles.option} ${maxPlayers === n ? styles.optionActive : ''}`}
                            onClick={() => setMaxPlayers(n)}
                          >
                            {n}명
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.field}>
                      <div className={styles.label}>방 공개</div>
                      <div className={styles.options}>
                        <button
                          className={`${styles.option} ${isPublic ? styles.optionActive : ''}`}
                          onClick={() => setIsPublic(true)}
                        >
                          공개방
                        </button>
                        <button
                          className={`${styles.option} ${!isPublic ? styles.optionActive : ''}`}
                          onClick={() => setIsPublic(false)}
                        >
                          비공개방
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {onlineTab === 'join' && (
                  <div className={styles.field}>
                    <label className={styles.label}>방 코드</label>
                    <input
                      className={`${styles.input} ${styles.codeInput}`}
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="4자리 코드"
                      maxLength={4}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    />
                  </div>
                )}

                {onlineTab === 'browse' && (
                  <div className={styles.roomList}>
                    {!playerName.trim() && (
                      <div className={styles.browseHint}>이름을 먼저 입력해야 참가할 수 있습니다</div>
                    )}
                    {publicRooms.length === 0 ? (
                      <div className={styles.emptyRooms}>참가 가능한 공개방이 없습니다</div>
                    ) : (
                      publicRooms.map((room: RoomInfo) => {
                        const isJoinable = room.phase === 'waiting' && room.playerCount < room.maxPlayers;
                        return (
                          <button
                            key={room.roomId}
                            className={styles.roomItem}
                            onClick={() => handleJoinFromBrowse(room.roomId)}
                            disabled={isJoinable && !playerName.trim()}
                          >
                            <div className={styles.roomItemPlayers}>
                              {room.playerCount}/{room.maxPlayers}
                            </div>
                            <div className={styles.roomItemInfo}>
                              <span className={styles.roomItemHost}>{room.hostName}의 방</span>
                              <span className={styles.roomItemCode}>{room.roomId}</span>
                            </div>
                            <div className={`${styles.roomItemJoin} ${room.phase === 'playing' ? styles.roomItemSpectate : ''}`}>
                              {room.phase === 'playing' ? '관전' : '참가'}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {error && <div className={styles.errorMsg}>{error}</div>}

                {connectionState === 'connecting' ? (
                  <div className={styles.connecting}>연결 중…</div>
                ) : onlineTab !== 'browse' ? (
                  <button
                    className={styles.primaryBtn}
                    onClick={onlineTab === 'create' ? handleCreateRoom : handleJoinRoom}
                    disabled={
                      onlineTab === 'create'
                        ? !playerName.trim()
                        : !playerName.trim() || roomCode.trim().length < 4
                    }
                  >
                    {onlineTab === 'create' ? '방 만들기' : '참가하기'}
                  </button>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NewGameModal;
