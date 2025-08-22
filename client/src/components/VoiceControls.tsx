import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface VoiceControlsProps {
  roomId: string;
}

export default function VoiceControls({ roomId }: VoiceControlsProps) {
  const [autoMute, setAutoMute] = useState(true);
  const [announcements, setAnnouncements] = useState(true);
  const [isConnectedToVoice, setIsConnectedToVoice] = useState(false);

  const muteMutation = useMutation({
    mutationFn: async ({ playerId, muted }: { playerId: string; muted: boolean }) => {
      await apiRequest('POST', `/api/rooms/${roomId}/voice/mute`, { playerId, muted });
    },
  });

  const handleJoinVoice = () => {
    // In a real implementation, this would integrate with Discord's voice API
    setIsConnectedToVoice(!isConnectedToVoice);
  };

  return (
    <div className="bg-discord-dark rounded-lg p-4" data-testid="voice-controls">
      <h3 className="font-semibold mb-3 flex items-center">
        <i className="fas fa-volume-up mr-2"></i>
        Voice Activity
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Auto-mute during opponent's turn</span>
          <Switch 
            checked={autoMute}
            onCheckedChange={setAutoMute}
            data-testid="auto-mute-toggle"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">Voice announcements</span>
          <Switch 
            checked={announcements}
            onCheckedChange={setAnnouncements}
            data-testid="announcements-toggle"
          />
        </div>
        
        <Button 
          className={`w-full py-2 px-4 rounded transition-colors mt-3 ${
            isConnectedToVoice 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-discord-primary hover:bg-blue-600'
          }`}
          onClick={handleJoinVoice}
          data-testid="voice-connect-button"
        >
          <i className={`fas ${isConnectedToVoice ? 'fa-sign-out-alt' : 'fa-headphones'} mr-2`}></i>
          {isConnectedToVoice ? 'Leave Voice Channel' : 'Join Voice Channel'}
        </Button>
        
        {isConnectedToVoice && (
          <div className="mt-3 p-2 bg-pool-green bg-opacity-10 border border-pool-green rounded text-center">
            <i className="fas fa-check-circle text-pool-green mr-2"></i>
            <span className="text-sm text-pool-green">Connected to voice channel</span>
          </div>
        )}
      </div>
    </div>
  );
}
