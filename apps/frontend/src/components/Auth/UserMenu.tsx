import { useState, useRef, useEffect } from 'react';
import { useAuthStore, BACKEND_URL } from '../../store/authStore';
import styles from './UserMenu.module.css';

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  if (!user) {
    return (
      <button className={styles.loginBtn} onClick={handleLogin}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        로그인
      </button>
    );
  }

  return (
    <div className={styles.wrapper} ref={menuRef}>
      <button className={styles.avatarBtn} onClick={() => setOpen((o) => !o)}>
        {user.picture ? (
          <img src={user.picture} alt={user.name} className={styles.avatar} referrerPolicy="no-referrer" />
        ) : (
          <div className={styles.avatarFallback}>{user.name[0]?.toUpperCase()}</div>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userEmail}>{user.email}</div>
          </div>
          <hr className={styles.divider} />
          <button className={styles.logoutBtn} onClick={() => { logout(); setOpen(false); }}>
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
