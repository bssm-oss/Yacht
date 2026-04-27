import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useMultiplayerStore } from '../store/multiplayerStore';

export function useMultiplayer() {
  const multiplayer = useMultiplayerStore();
  const gameStore = useGameStore();

  useEffect(() => {
    if (multiplayer.gameState) {
      useGameStore.setState({ gameState: multiplayer.gameState });
    }
  }, [multiplayer.gameState]);

  return multiplayer;
}
