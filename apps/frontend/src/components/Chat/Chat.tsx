import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../../store/multiplayerStore';
import styles from './Chat.module.css';

interface ChatProps {
  messages: ChatMessage[];
  playerId: string | null;
  onSend: (msg: string) => void;
}

export function Chat({ messages, playerId, onSend }: ChatProps) {
  const [inputActive, setInputActive] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openInput = useCallback(() => {
    setInputActive(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const closeInput = useCallback(() => {
    setInputActive(false);
    setInput('');
  }, []);

  const handleSend = useCallback(() => {
    if (input.trim()) onSend(input.trim());
    closeInput();
  }, [input, onSend, closeInput]);

  // 전역 Enter 키로 입력창 활성화
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        openInput();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openInput]);

  // 새 메시지 오면 스크롤
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const displayed = messages.slice(-12);

  return (
    <div className={styles.root}>
      <div className={styles.list} ref={listRef}>
        {displayed.map((m, i) => (
          <div key={i} className={styles.msg}>
            <span className={`${styles.name} ${m.playerId === playerId ? styles.myName : ''}`}>
              {m.playerName}
            </span>
            <span className={styles.text}>{m.message}</span>
          </div>
        ))}
      </div>

      <div className={`${styles.inputWrap} ${inputActive ? styles.inputVisible : ''}`}>
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
            if (e.key === 'Escape') closeInput();
          }}
          onBlur={closeInput}
          placeholder="메시지 입력 후 Enter"
          maxLength={200}
        />
      </div>

      {!inputActive && (
        <div className={styles.hint}>Enter — 채팅</div>
      )}
    </div>
  );
}

export default Chat;
