import { useEffect, useRef, useState } from 'react';
import { type GameState, type Ball } from '@shared/schema';
import { Button } from '@/components/ui/button';

interface GameCanvasProps {
  gameState?: GameState | null;
  isMyTurn: boolean;
  onShoot: (power: number, angle: number) => void;
  onAim: (cuePosition: { x: number, y: number, angle: number }) => void;
}

export default function GameCanvas({ gameState, isMyTurn, onShoot, onAim }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shotPower, setShotPower] = useState(0);
  const [aimAngle, setAimAngle] = useState(0);
  const [isAiming, setIsAiming] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const TABLE_WIDTH = 800;
  const TABLE_HEIGHT = 400;
  const BALL_RADIUS = 12;

  const POCKET_POSITIONS = [
    { x: 0, y: 0 },
    { x: TABLE_WIDTH / 2, y: 0 },
    { x: TABLE_WIDTH, y: 0 },
    { x: 0, y: TABLE_HEIGHT },
    { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT },
    { x: TABLE_WIDTH, y: TABLE_HEIGHT },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = TABLE_WIDTH;
    canvas.height = TABLE_HEIGHT;

    drawTable(ctx);
    
    if (gameState?.balls) {
      drawBalls(ctx, gameState.balls);
    }

    if (isMyTurn && isAiming) {
      drawCueStick(ctx);
    }
  }, [gameState, isAiming, mousePosition, isMyTurn]);

  const drawTable = (ctx: CanvasRenderingContext2D) => {
    // Table felt
    ctx.fillStyle = '#0F4C3A';
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Table border
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Draw pockets
    ctx.fillStyle = '#000000';
    POCKET_POSITIONS.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, 20, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw center line and spot
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(TABLE_WIDTH / 2, 0);
    ctx.lineTo(TABLE_WIDTH / 2, TABLE_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Head spot
    ctx.beginPath();
    ctx.arc(TABLE_WIDTH * 0.25, TABLE_HEIGHT * 0.5, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Foot spot
    ctx.beginPath();
    ctx.arc(TABLE_WIDTH * 0.75, TABLE_HEIGHT * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBalls = (ctx: CanvasRenderingContext2D, balls: Ball[]) => {
    balls.forEach(ball => {
      if (!ball.visible) return;

      ctx.save();
      
      // Ball shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(ball.x + 2, ball.y + 2, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Ball body
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Ball outline
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Ball highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(ball.x - 3, ball.y - 3, BALL_RADIUS * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Ball number for non-cue balls
      if (ball.type !== 'cue' && ball.id > 0) {
        ctx.fillStyle = ball.type === '8ball' ? '#FFFFFF' : '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ball.id.toString(), ball.x, ball.y);
      }

      // Stripe pattern for stripe balls
      if (ball.type === 'stripe') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });
  };

  const drawCueStick = (ctx: CanvasRenderingContext2D) => {
    if (!gameState?.balls) return;

    const cueBall = gameState.balls.find(ball => ball.type === 'cue' && ball.visible);
    if (!cueBall) return;

    const dx = mousePosition.x - cueBall.x;
    const dy = mousePosition.y - cueBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 50) return; // Don't draw if too close

    const angle = Math.atan2(dy, dx);
    const cueDistance = 50 + (shotPower / 100) * 100;
    const cueStartX = cueBall.x - Math.cos(angle) * cueDistance;
    const cueStartY = cueBall.y - Math.sin(angle) * cueDistance;
    const cueEndX = cueBall.x - Math.cos(angle) * 25;
    const cueEndY = cueBall.y - Math.sin(angle) * 25;

    // Draw cue stick
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cueStartX, cueStartY);
    ctx.lineTo(cueEndX, cueEndY);
    ctx.stroke();

    // Draw aim line
    ctx.strokeStyle = `rgba(0, 212, 170, ${0.3 + (shotPower / 100) * 0.7})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(cueBall.x + Math.cos(angle) * 100, cueBall.y + Math.sin(angle) * 100);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMyTurn) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    setMousePosition({ x: mouseX, y: mouseY });
    setIsAiming(true);

    if (gameState?.balls) {
      const cueBall = gameState.balls.find(ball => ball.type === 'cue' && ball.visible);
      if (cueBall) {
        const dx = mouseX - cueBall.x;
        const dy = mouseY - cueBall.y;
        const angle = Math.atan2(dy, dx);
        
        onAim({ x: cueBall.x, y: cueBall.y, angle });
      }
    }
  };

  const handleCanvasMouseLeave = () => {
    setIsAiming(false);
  };

  const handleShoot = () => {
    if (!isMyTurn || shotPower === 0) return;

    if (gameState?.balls) {
      const cueBall = gameState.balls.find(ball => ball.type === 'cue' && ball.visible);
      if (cueBall) {
        const dx = mousePosition.x - cueBall.x;
        const dy = mousePosition.y - cueBall.y;
        const angle = Math.atan2(dy, dx);
        
        onShoot(shotPower, angle);
        setShotPower(0);
        setIsAiming(false);
      }
    }
  };

  const handlePowerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const power = parseInt(e.target.value);
    setShotPower(power);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded cursor-crosshair bg-pool-felt border-8 border-amber-800"
        style={{ aspectRatio: '2/1' }}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        data-testid="pool-table-canvas"
      />
      
      {/* Power Meter */}
      <div className="absolute bottom-4 left-4 bg-discord-darker bg-opacity-90 rounded-lg p-3">
        <div className="text-sm text-discord-gray mb-1">Shot Power</div>
        <div className="w-32 h-3 bg-discord-dark rounded mb-2">
          <div 
            className="h-full bg-gradient-to-r from-pool-green to-red-500 rounded transition-all duration-150" 
            style={{ width: `${shotPower}%` }}
            data-testid="power-meter-fill"
          ></div>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={shotPower}
          onChange={handlePowerChange}
          className="w-full h-2 bg-discord-dark rounded-lg appearance-none cursor-pointer"
          disabled={!isMyTurn}
          data-testid="power-slider"
        />
      </div>
      
      {/* Touch Controls for Mobile */}
      <div className="absolute bottom-4 right-4 md:hidden">
        <Button 
          size="lg"
          className="bg-discord-primary hover:bg-blue-600 p-3 rounded-full shadow-lg" 
          onClick={handleShoot}
          disabled={!isMyTurn || shotPower === 0}
          data-testid="mobile-shoot-button"
        >
          <i className="fas fa-hand-point-up text-xl"></i>
        </Button>
      </div>
      
      {/* Game Controls */}
      <div className="flex items-center justify-center mt-4 space-x-4">
        <Button 
          className="bg-pool-green hover:bg-green-600 px-6 py-2 font-medium" 
          onClick={handleShoot}
          disabled={!isMyTurn || shotPower === 0}
          data-testid="shoot-button"
        >
          <i className="fas fa-bullseye mr-2"></i>
          Shoot
        </Button>
        <Button 
          variant="secondary"
          className="bg-discord-dark hover:bg-gray-600 px-4 py-2" 
          onClick={() => {
            setShotPower(0);
            setIsAiming(false);
          }}
          disabled={!isMyTurn}
          data-testid="reset-aim-button"
        >
          <i className="fas fa-undo mr-2"></i>
          Reset Aim
        </Button>
        <Button 
          variant="destructive"
          className="bg-red-600 hover:bg-red-700 px-4 py-2" 
          data-testid="forfeit-button"
        >
          <i className="fas fa-flag mr-2"></i>
          Forfeit
        </Button>
      </div>
    </div>
  );
}
