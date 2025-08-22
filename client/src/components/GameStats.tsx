import { type GameState, type Player } from '@shared/schema';
import { useEffect, useState } from 'react';

interface GameStatsProps {
  gameState?: GameState | null;
  players: Player[];
}

export default function GameStats({ gameState, players }: GameStatsProps) {
  const [gameDuration, setGameDuration] = useState(0);
  const [totalShots, setTotalShots] = useState(0);
  const [successfulShots, setSuccessfulShots] = useState(0);

  useEffect(() => {
    // Update game duration every second
    const interval = setInterval(() => {
      setGameDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateAccuracy = (): string => {
    if (totalShots === 0) return '0%';
    return `${Math.round((successfulShots / totalShots) * 100)}%`;
  };

  return (
    <div className="bg-discord-dark rounded-lg p-4" data-testid="game-stats">
      <h3 className="font-semibold mb-3 flex items-center">
        <i className="fas fa-chart-bar mr-2"></i>
        Game Stats
      </h3>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-discord-gray">Game Duration</span>
          <span className="font-mono" data-testid="stat-duration">
            {formatDuration(gameDuration)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-discord-gray">Total Shots</span>
          <span className="font-mono" data-testid="stat-total-shots">
            {totalShots}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-discord-gray">Successful Pockets</span>
          <span className="font-mono" data-testid="stat-successful-shots">
            {successfulShots}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-discord-gray">Accuracy</span>
          <span className="font-mono text-pool-green" data-testid="stat-accuracy">
            {calculateAccuracy()}
          </span>
        </div>
        
        {gameState && (
          <>
            <div className="flex justify-between">
              <span className="text-discord-gray">Turn Time Left</span>
              <span className="font-mono text-yellow-400" data-testid="stat-time-left">
                {Math.floor((gameState.timeLeft || 0) / 60)}:{((gameState.timeLeft || 0) % 60).toString().padStart(2, '0')}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-discord-gray">Game Phase</span>
              <span className="font-mono capitalize" data-testid="stat-game-phase">
                {gameState.gamePhase}
              </span>
            </div>
          </>
        )}
        
        {players.length === 2 && (
          <div className="pt-2 border-t border-discord-darker">
            <div className="text-xs text-discord-gray mb-2">Player Scores</div>
            {players.map((player, index) => (
              <div key={player.id} className="flex justify-between text-xs mb-1">
                <span>Player {index + 1}</span>
                <span className="font-mono" data-testid={`stat-player-${index}-score`}>
                  {7 - (player.score || 7)} balls potted
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
