import { useState, useEffect } from 'react';
import { type GameState, type GameMessage } from '@shared/schema';
import { useWebSocket } from './useWebSocket';

export function useGameState(roomId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const handleWebSocketMessage = (message: GameMessage) => {
    setLastUpdate(Date.now());
    
    switch (message.type) {
      case 'gameUpdate':
        if (message.payload.gameState) {
          setGameState(message.payload.gameState);
        }
        break;
      
      case 'turnChange':
        // Handle turn changes
        console.log('Turn changed:', message.payload);
        break;
      
      case 'gameEnd':
        console.log('Game ended:', message.payload);
        break;
      
      default:
        console.log('Unhandled message type:', message.type);
    }
  };

  const { sendMessage } = useWebSocket(roomId, handleWebSocketMessage);

  return {
    gameState,
    sendMessage,
    lastUpdate
  };
}
