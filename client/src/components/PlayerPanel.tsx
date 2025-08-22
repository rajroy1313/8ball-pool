import { type Player, type User } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

interface PlayerPanelProps {
  players: Player[];
}

export default function PlayerPanel({ players }: PlayerPanelProps) {
  const getUserQuery = (userId: string) => useQuery({
    queryKey: ['/api/users', userId],
    enabled: !!userId,
  });

  return (
    <div className="bg-discord-dark rounded-lg p-4" data-testid="players-panel">
      <h3 className="font-semibold mb-3 flex items-center">
        <i className="fas fa-users mr-2"></i>
        Players
      </h3>
      
      {players.length === 0 ? (
        <div className="text-center py-4 text-discord-gray">
          <i className="fas fa-user-plus text-2xl mb-2 block"></i>
          <p>Waiting for players to join...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((player, index) => (
            <PlayerCard key={player.id} player={player} index={index} />
          ))}
        </div>
      )}
      
      {players.length === 1 && (
        <div className="mt-4 p-3 bg-yellow-500 bg-opacity-10 border border-yellow-500 rounded-lg text-center">
          <i className="fas fa-clock mr-2"></i>
          <span className="text-yellow-400">Waiting for opponent...</span>
        </div>
      )}
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  index: number;
}

function PlayerCard({ player, index }: PlayerCardProps) {
  const { data: user } = useQuery({
    queryKey: ['/api/users', player.userId],
    enabled: !!player.userId,
  });

  const isActive = player.isCurrentPlayer;
  const ballType = player.ballType || (index === 0 ? 'Stripes' : 'Solids');
  const ballsLeft = player.score || 7;

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg mb-2 transition-all ${
        isActive 
          ? 'bg-pool-green bg-opacity-10 border border-pool-green' 
          : 'bg-discord-dark border border-transparent'
      }`}
      data-testid={`player-card-${index}`}
    >
      <div className="flex items-center space-x-3">
        {/* Discord-style avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${
          index === 0 ? 'bg-discord-primary' : 'bg-red-600'
        }`}>
          <i className="fas fa-user text-white"></i>
          
          {/* Voice Activity Indicator */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-discord-dark flex items-center justify-center ${
            player.isMuted ? 'bg-red-500' : 'bg-pool-green'
          }`}>
            <i className={`fas ${player.isMuted ? 'fa-microphone-slash' : 'fa-microphone'} text-xs`}></i>
          </div>
        </div>
        
        <div>
          <div className="font-medium" data-testid={`player-name-${index}`}>
            {user?.username || `Player ${index + 1}`}
          </div>
          <div className={`text-xs ${
            isActive 
              ? 'text-pool-green' 
              : index === 0 ? 'text-blue-400' : 'text-red-400'
          }`} data-testid={`player-status-${index}`}>
            {ballType} • {isActive ? 'Your Turn' : 'Waiting'}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-mono text-lg" data-testid={`player-score-${index}`}>
          {ballsLeft}
        </div>
        <div className="text-xs text-discord-gray">balls left</div>
      </div>
    </div>
  );
}
