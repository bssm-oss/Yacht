import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useMultiplayerStore } from '../store/multiplayerStore';
import type { MultiplayerStore } from '../store/multiplayerStore';

export function useMultiplayer(): MultiplayerStore {
  const multiplayer = useMultiplayerStore();

  useEffect(() => {
    if (multiplayer.gameState) {
      useGameStore.setState({ gameState: multiplayer.gameState });
    }
  }, [multiplayer.gameState]);

  return multiplayer;
}
