import { useEffect, useRef } from 'react';
import { type GameMessage } from '@shared/schema';

export function useWebSocket(roomId: string, onMessage: (message: GameMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?roomId=${roomId}`;
    console.log('[DEBUG] Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[DEBUG] WebSocket connected to room:', roomId);
    };

    ws.onmessage = (event) => {
      try {
        const message: GameMessage = JSON.parse(event.data);
        console.log('[DEBUG] WebSocket message received:', message.type, message.payload);
        onMessage(message);
      } catch (error) {
        console.error('[ERROR] Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('[DEBUG] WebSocket disconnected:', event.code, event.reason);
    };

    ws.onerror = (error) => {
      console.error('[ERROR] WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [roomId, onMessage]);

  const sendMessage = (message: any) => {
    console.log('[DEBUG] Sending WebSocket message:', message.type, message.payload);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WARN] WebSocket not ready, message not sent:', wsRef.current?.readyState);
    }
  };

  return { sendMessage };
}
