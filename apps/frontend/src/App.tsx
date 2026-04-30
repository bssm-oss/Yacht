import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { BoardListPage } from './pages/BoardListPage';
import { BoardDetailPage } from './pages/BoardDetailPage';
import { AuthCallback } from './components/Auth/AuthCallback';

function App() {
  // OAuth 콜백 페이지 처리 (/auth/callback#token=...)
  const [isAuthCallback] = useState(() => window.location.pathname === '/auth/callback');
  const [authDone, setAuthDone] = useState(false);

  if (isAuthCallback && !authDone) {
    return <AuthCallback onDone={() => setAuthDone(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/room/:roomId" element={<GamePage />} />
      <Route path="/room" element={<GamePage />} />
      <Route path="/board" element={<BoardListPage />} />
      <Route path="/board/:postId" element={<BoardDetailPage />} />
      {/* Catch-all: redirect unknown paths to lobby */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
