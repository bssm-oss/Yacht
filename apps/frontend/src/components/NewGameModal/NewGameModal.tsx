import { useState } from 'react';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import styles from './NewGameModal.module.css';

interface NewGameModalProps {
  onStartLocal: (playerCount: number) => void;
  onClose: () => void;
}

export function NewGameModal({ onStartLocal, onClose }: NewGameModalProps) {
  const [tab, setTab] = useState<'local' | 'online'>('local');
  const [playerCount, setPlayerCount] = useState(1);
  const [onlineTab, setOnlineTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);

  const { createRoom, joinRoom, disconnect, roomId, connectionState, error } =
    useMultiplayerStore();

  const isConnected = connectionState === 'connected' && roomId;

  const handleCreateRoom = async () => {
    if (!playerName.trim()) return;
    await createRoom(playerName.trim());
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || roomCode.trim().length < 4) return;
    await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
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
      <div className={styles.modal}>
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
                  <button className={styles.primaryBtn} onClick={onClose}>
                    게임으로
                  </button>
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
                    방 참가
                  </button>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>내 이름</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    maxLength={20}
                    onKeyDown={(e) => e.key === 'Enter' && (onlineTab === 'create' ? handleCreateRoom() : handleJoinRoom())}
                  />
                </div>

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

                {error && <div className={styles.errorMsg}>{error}</div>}

                {connectionState === 'connecting' ? (
                  <div className={styles.connecting}>연결 중…</div>
                ) : (
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
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NewGameModal;
