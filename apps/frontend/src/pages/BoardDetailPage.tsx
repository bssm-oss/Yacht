import { useParams, Link } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { GameHeader } from '../components/GameHeader/GameHeader';
import styles from './Board.module.css';
import layoutStyles from '../styles/layout.module.css';

export function BoardDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const local = useGameStore();

  // No API yet — placeholder content
  const post = null;

  return (
    <div className={layoutStyles.app} data-theme={local.theme} data-mood={local.mood}>
      <GameHeader
        playerName={local.gameState.players[0]?.name ?? '플레이어'}
        rollsUsed={0}
        isOnline={false}
      />

      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <Link to="/board" className={styles.backBtn}>
            ← 목록으로
          </Link>
        </div>

        <div className={styles.detailCard}>
          {post ? null : (
            <div className={styles.detailPlaceholder}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>게시글을 불러오는 중입니다 (postId: {postId})</p>
              <p style={{ fontSize: '12px', opacity: 0.6 }}>준비 중입니다 — API 연동 후 표시됩니다</p>
            </div>
          )}

          <div className={styles.commentsSection}>
            <p className={styles.commentsTitle}>댓글</p>
            <p className={styles.commentsEmpty}>댓글이 없습니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}
