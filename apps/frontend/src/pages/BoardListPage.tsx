import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import styles from './Board.module.css';
import layoutStyles from '../styles/layout.module.css';
import { GameHeader } from '../components/GameHeader/GameHeader';

type Category = 'all' | 'notice' | 'patch' | 'free';

const CATEGORY_LABELS: Record<Category, string> = {
  all: '전체',
  notice: '공지사항',
  patch: '패치노트',
  free: '자유게시판',
};

// Placeholder post type — will be replaced with API types later
interface Post {
  id: string;
  title: string;
  category: 'notice' | 'patch' | 'free';
  author: string;
  date: string;
}

// Empty for now — will be fetched from API
const MOCK_POSTS: Post[] = [];

function CategoryBadge({ category }: { category: Post['category'] }) {
  if (category === 'notice') {
    return <span className={`${styles.badge} ${styles.badgeNotice}`}>공지</span>;
  }
  if (category === 'patch') {
    return <span className={`${styles.badge} ${styles.badgePatch}`}>패치</span>;
  }
  return <span className={`${styles.badge} ${styles.badgeFree}`}>자유</span>;
}

export function BoardListPage() {
  const [activeTab, setActiveTab] = useState<Category>('all');
  const { user } = useAuthStore();
  const local = useGameStore();

  const isAdmin = user?.role === 'ADMIN';

  const filteredPosts = activeTab === 'all'
    ? MOCK_POSTS
    : MOCK_POSTS.filter((p) => p.category === activeTab);

  return (
    <div className={layoutStyles.app} data-theme={local.theme} data-mood={local.mood}>
      <GameHeader
        playerName={local.gameState.players[0]?.name ?? '플레이어'}
        rollsUsed={0}
        isOnline={false}
      />

      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>게시판</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link to="/" className={styles.backBtn}>
              ← 로비로
            </Link>
            {isAdmin && (
              <button className={styles.writeBtn} disabled>
                글쓰기
              </button>
            )}
          </div>
        </div>

        <div className={styles.tabs}>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              className={`${styles.tab} ${activeTab === cat ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className={styles.postTable}>
          {filteredPosts.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p>게시글이 없습니다</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <Link key={post.id} to={`/board/${post.id}`} className={styles.postRow}>
                <div className={styles.postInfo}>
                  <CategoryBadge category={post.category} />
                  <span className={styles.postTitle}>{post.title}</span>
                </div>
                <span className={styles.postAuthor}>{post.author}</span>
                <span className={styles.postDate}>{post.date}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
