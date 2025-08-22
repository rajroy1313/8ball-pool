import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import GameCanvas from "@/components/GameCanvas";
import PlayerPanel from "@/components/PlayerPanel";
import VoiceControls from "@/components/VoiceControls";
import GameStats from "@/components/GameStats";
import { useGameState } from "@/hooks/useGameState";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function GamePage() {
  const { roomId } = useParams();
  
  const { data: gameRoom, isLoading: roomLoading, error: roomError } = useQuery({
    queryKey: ['/api/rooms', roomId],
    enabled: !!roomId,
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['/api/rooms', roomId, 'players'],
    enabled: !!roomId,
    refetchInterval: 2000,
  });

  const { data: gameState, isLoading: stateLoading } = useQuery({
    queryKey: ['/api/rooms', roomId, 'state'],
    enabled: !!roomId,
    refetchInterval: 1000,
  });

  const { gameState: liveGameState, sendMessage } = useGameState(roomId || '');
  useWebSocket(roomId || '', (message) => {
    // Handle real-time updates
    console.log('WebSocket message:', message);
  });

  if (roomLoading || playersLoading || stateLoading) {
    return (
      <div className="min-h-screen bg-gaming-dark flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pool-green mx-auto mb-4"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  if (roomError || !gameRoom) {
    return (
      <div className="min-h-screen bg-gaming-dark flex items-center justify-center">
        <Card className="bg-discord-dark border-red-500 p-6">
          <div className="flex items-center space-x-2 text-red-500">
            <AlertCircle className="h-6 w-6" />
            <h1 className="text-xl font-bold">Game Not Found</h1>
          </div>
          <p className="text-discord-gray mt-2">
            The game room could not be found or has been closed.
          </p>
        </Card>
      </div>
    );
  }

  const currentPlayer = players?.find(p => p.isCurrentPlayer);
  const isMyTurn = currentPlayer !== undefined; // This would need user authentication in real app

  return (
    <div className="min-h-screen bg-gaming-dark text-white font-inter">
      {/* Header */}
      <header className="bg-discord-darker border-b border-discord-dark px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-circle text-pool-green text-2xl"></i>
              <h1 className="text-xl font-bold" data-testid="game-title">8-Ball Pool Bot</h1>
              <span className="bg-pool-green text-black px-2 py-1 rounded text-xs font-mono">
                {gameRoom.status === 'active' ? 'LIVE' : 'WAITING'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-discord-dark px-3 py-2 rounded">
              <i className="fab fa-discord text-discord-primary"></i>
              <span className="text-sm" data-testid="server-name">Gaming Server</span>
              <span className="text-discord-gray text-xs">#pool-games</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-pool-green rounded-full animate-pulse"></div>
              <span className="text-sm text-discord-gray">Bot Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Game Canvas Area */}
        <div className="flex-1 flex flex-col p-4">
          <div className="bg-discord-dark rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" data-testid="game-table-title">Game Table</h2>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  isMyTurn ? 'bg-pool-green text-black' : 'bg-yellow-500 text-black'
                }`} data-testid="turn-indicator">
                  {currentPlayer ? `${currentPlayer.ballType || 'Player'}'s Turn` : 'Waiting for players...'}
                </span>
                <div className="flex items-center space-x-2 text-sm text-discord-gray">
                  <i className="fas fa-clock"></i>
                  <span data-testid="game-timer">
                    {gameState ? `${Math.floor(gameState.timeLeft / 60)}:${(gameState.timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
                  </span>
                </div>
              </div>
            </div>
            
            <GameCanvas 
              gameState={liveGameState || gameState} 
              isMyTurn={isMyTurn}
              onShoot={(power, angle) => sendMessage({ type: 'shoot', payload: { power, angle } })}
              onAim={(cuePosition) => sendMessage({ type: 'aim', payload: { cuePosition } })}
            />
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="w-80 bg-discord-darker p-4 space-y-4 overflow-y-auto">
          <PlayerPanel players={players || []} />
          <VoiceControls roomId={roomId || ''} />
          <GameStats gameState={gameState} players={players || []} />
          
          {/* Discord Integration */}
          <div className="bg-discord-dark rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <i className="fab fa-discord mr-2"></i>
              Discord Bot
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-discord-darker rounded" data-testid="bot-commands">
                <span>Bot Commands</span>
                <i className="fas fa-chevron-right text-discord-gray"></i>
              </div>
              <div className="flex items-center justify-between p-2 bg-discord-darker rounded" data-testid="match-history">
                <span>Match History</span>
                <i className="fas fa-chevron-right text-discord-gray"></i>
              </div>
              <div className="flex items-center justify-between p-2 bg-discord-darker rounded" data-testid="tournament-mode">
                <span>Tournament Mode</span>
                <i className="fas fa-chevron-right text-discord-gray"></i>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-discord-darker rounded border-l-4 border-pool-green">
              <div className="text-xs text-discord-gray mb-1">Last Bot Message</div>
              <div className="text-sm" data-testid="bot-last-message">Game room created! Use /pool-join to join.</div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Controls */}
      <div className="md:hidden bg-discord-darker border-t border-discord-dark p-4">
        <div className="flex items-center justify-between">
          <button 
            className="flex items-center space-x-2 bg-discord-dark px-4 py-2 rounded" 
            data-testid="mobile-voice-toggle"
          >
            <i className="fas fa-microphone"></i>
            <span className="text-sm">Unmuted</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="text-center">
              <div className="text-xs text-discord-gray">Your Turn</div>
              <div className="text-sm font-medium" data-testid="mobile-timer">02:30</div>
            </div>
          </div>
          
          <button 
            className="bg-pool-green px-4 py-2 rounded font-medium" 
            data-testid="mobile-menu-button"
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
