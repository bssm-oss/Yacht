import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  role?: 'ADMIN' | 'USER';
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,

      login: (user, accessToken) => set({ user, accessToken }),

      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'yacht-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
);

/** 백엔드 주소 */
export const BACKEND_URL =
  import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';
