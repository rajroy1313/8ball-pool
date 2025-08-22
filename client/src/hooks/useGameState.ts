import { useState, useEffect } from 'react';
import { type GameState, type GameMessage } from '@shared/schema';
import { useWebSocket } from './useWebSocket';

export function useGameState(roomId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const handleWebSocketMessage = (message: GameMessage) => {
    console.log('[DEBUG] Handling game state message:', message.type);
    setLastUpdate(Date.now());
    
    switch (message.type) {
      case 'gameUpdate':
        if (message.payload.gameState) {
          console.log('[DEBUG] Updating game state:', message.payload.gameState.gamePhase);
          setGameState(message.payload.gameState);
        }
        if (message.payload.shotResult) {
          console.log('[DEBUG] Shot result:', message.payload.shotResult);
        }
        break;
      
      case 'playerJoin':
        console.log('[DEBUG] Player joined:', message.payload.player);
        break;
      
      case 'turnChange':
        console.log('[DEBUG] Turn changed:', message.payload);
        break;
      
      case 'gameEnd':
        console.log('[DEBUG] Game ended:', message.payload);
        break;
      
      case 'voiceUpdate':
        console.log('[DEBUG] Voice update:', message.payload);
        break;
      
      default:
        console.log('[DEBUG] Unhandled message type:', message.type, message.payload);
    }
  };

  const { sendMessage } = useWebSocket(roomId, handleWebSocketMessage);

  return {
    gameState,
    sendMessage,
    lastUpdate
  };
}
