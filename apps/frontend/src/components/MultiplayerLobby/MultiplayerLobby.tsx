import { useState } from 'react';
import { useMultiplayerStore } from '../../store/multiplayerStore';
import styles from './MultiplayerLobby.module.css';

interface MultiplayerLobbyProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MultiplayerLobby({ isOpen, onClose }: MultiplayerLobbyProps) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [copied, setCopied] = useState(false);

  const { createRoom, joinRoom, disconnect, roomId: currentRoomId, connectionState, error } = useMultiplayerStore();

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!playerName.trim()) return;
    await createRoom(playerName.trim(), 4, true);
  };

  const handleJoin = async () => {
    if (!playerName.trim() || !roomId.trim()) return;
    await joinRoom(roomId.trim().toUpperCase(), playerName.trim());
  };

  const handleCopy = () => {
    if (currentRoomId) {
      navigator.clipboard.writeText(currentRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = () => {
    disconnect();
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Multiplayer</h2>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>

        {connectionState === 'connected' && currentRoomId ? (
          <div className={styles.connected}>
            <div className={styles.roomInfo}>
              <div className={styles.label}>Room Code</div>
              <div className={styles.code} onClick={handleCopy}>
                {currentRoomId}
                <span className={styles.copy}>{copied ? 'Copied!' : 'Copy'}</span>
              </div>
            </div>
            <div className={styles.status}>Connected</div>
            <button className={styles.leaveBtn} onClick={handleLeave}>
              Leave Room
            </button>
          </div>
        ) : (
          <>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${tab === 'create' ? styles.active : ''}`}
                onClick={() => setTab('create')}
              >
                Create Room
              </button>
              <button
                className={`${styles.tab} ${tab === 'join' ? styles.active : ''}`}
                onClick={() => setTab('join')}
              >
                Join Room
              </button>
            </div>

            <div className={styles.content}>
              <div className={styles.field}>
                <label className={styles.label}>Your Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>

              {tab === 'join' && (
                <div className={styles.field}>
                  <label className={styles.label}>Room Code</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="Enter 4-letter code"
                    maxLength={4}
                  />
                </div>
              )}

              {error && <div className={styles.error}>{error}</div>}

              {connectionState === 'connecting' ? (
                <div className={styles.spinner}>Connecting...</div>
              ) : (
                <button
                  className={styles.actionBtn}
                  onClick={tab === 'create' ? handleCreate : handleJoin}
                  disabled={tab === 'create' ? !playerName.trim() : !playerName.trim() || !roomId.trim()}
                >
                  {tab === 'create' ? 'Create Room' : 'Join Room'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MultiplayerLobby;
