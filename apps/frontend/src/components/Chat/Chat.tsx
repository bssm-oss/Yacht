import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../store/multiplayerStore';
import styles from './Chat.module.css';

interface ChatProps {
  messages: ChatMessage[];
  playerId: string | null;
  onSend: (msg: string) => void;
}

export function Chat({ messages, playerId, onSend }: ChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLenRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      if (!open) setUnread((n) => n + (messages.length - prevLenRef.current));
      else if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }
    prevLenRef.current = messages.length;
  }, [messages.length, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className={styles.root}>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span>채팅</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className={styles.list} ref={listRef}>
            {messages.length === 0 && (
              <div className={styles.empty}>메시지가 없습니다</div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`${styles.msg} ${m.playerId === playerId ? styles.mine : ''}`}
              >
                {m.playerId !== playerId && (
                  <span className={styles.name}>{m.playerName}</span>
                )}
                <span className={styles.bubble}>{m.message}</span>
              </div>
            ))}
          </div>
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력..."
              maxLength={200}
            />
            <button className={styles.sendBtn} onClick={handleSend}>전송</button>
          </div>
        </div>
      )}
      <button className={styles.toggle} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {unread > 0 && <span className={styles.badge}>{unread}</span>}
      </button>
    </div>
  );
}

export default Chat;
