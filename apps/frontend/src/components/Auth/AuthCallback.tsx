/**
 * Google OAuth 콜백 처리 컴포넌트
 * 백엔드가 /auth/callback#token=... 으로 리다이렉트하면
 * 해시에서 토큰을 파싱해 저장합니다.
 */
import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export function AuthCallback({ onDone }: { onDone: () => void }) {
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    const hash = window.location.hash.slice(1); // '#token=...' → 'token=...'
    const params = new URLSearchParams(hash);
    const tokenParam = params.get('token');

    if (tokenParam) {
      try {
        const { accessToken, user } = JSON.parse(decodeURIComponent(tokenParam));
        if (accessToken && user) {
          login(user, accessToken);
          // 히스토리에서 토큰 제거
          window.history.replaceState(null, '', '/');
        }
      } catch (e) {
        console.error('[AuthCallback] 파싱 실패', e);
      }
    }
    onDone();
  }, [login, onDone]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'var(--font-text)',
      color: 'var(--text-secondary)',
    }}>
      로그인 중...
    </div>
  );
}
