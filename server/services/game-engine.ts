import { type Ball } from "@shared/schema";

export class GameEngine {
  private readonly TABLE_WIDTH = 800;
  private readonly TABLE_HEIGHT = 400;
  private readonly BALL_RADIUS = 12;
  private readonly FRICTION = 0.98;
  private readonly POCKET_POSITIONS = [
    { x: 0, y: 0 },
    { x: this.TABLE_WIDTH / 2, y: 0 },
    { x: this.TABLE_WIDTH, y: 0 },
    { x: 0, y: this.TABLE_HEIGHT },
    { x: this.TABLE_WIDTH / 2, y: this.TABLE_HEIGHT },
    { x: this.TABLE_WIDTH, y: this.TABLE_HEIGHT },
  ];

  createInitialBallLayout(): Ball[] {
    const balls: Ball[] = [];
    
    // Cue ball
    balls.push({
      id: 0,
      x: this.TABLE_WIDTH * 0.25,
      y: this.TABLE_HEIGHT * 0.5,
      vx: 0,
      vy: 0,
      color: '#FFFFFF',
      type: 'cue',
      potted: false,
      visible: true,
    });

    // 8-ball
    balls.push({
      id: 8,
      x: this.TABLE_WIDTH * 0.75,
      y: this.TABLE_HEIGHT * 0.5,
      vx: 0,
      vy: 0,
      color: '#000000',
      type: '8ball',
      potted: false,
      visible: true,
    });

    // Solid balls (1-7)
    const solidColors = ['#FFD700', '#0066CC', '#FF0000', '#800080', '#FF8C00', '#006400', '#800000'];
    for (let i = 1; i <= 7; i++) {
      const angle = (i - 1) * (Math.PI * 2 / 14);
      const radius = 30;
      balls.push({
        id: i,
        x: this.TABLE_WIDTH * 0.75 + Math.cos(angle) * radius,
        y: this.TABLE_HEIGHT * 0.5 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        color: solidColors[i - 1],
        type: 'solid',
        potted: false,
        visible: true,
      });
    }

    // Stripe balls (9-15)
    const stripeColors = ['#FFD700', '#0066CC', '#FF0000', '#800080', '#FF8C00', '#006400', '#800000'];
    for (let i = 9; i <= 15; i++) {
      const angle = (i - 9) * (Math.PI * 2 / 14) + Math.PI / 14;
      const radius = 30;
      balls.push({
        id: i,
        x: this.TABLE_WIDTH * 0.75 + Math.cos(angle) * radius,
        y: this.TABLE_HEIGHT * 0.5 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        color: stripeColors[i - 9],
        type: 'stripe',
        potted: false,
        visible: true,
      });
    }

    return balls;
  }

  simulateShot(balls: Ball[], power: number, angle: number): Ball[] {
    const updatedBalls = balls.map(ball => ({ ...ball }));
    const cueBall = updatedBalls.find(ball => ball.type === 'cue');
    
    if (!cueBall) return updatedBalls;

    // Apply initial velocity to cue ball
    const maxVelocity = 15;
    const velocity = (power / 100) * maxVelocity;
    cueBall.vx = Math.cos(angle) * velocity;
    cueBall.vy = Math.sin(angle) * velocity;

    // Simulate physics for several steps
    for (let step = 0; step < 100; step++) {
      let allStationary = true;

      for (const ball of updatedBalls) {
        if (ball.potted) continue;

        // Apply friction
        ball.vx *= this.FRICTION;
        ball.vy *= this.FRICTION;

        // Stop very slow movement
        if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
          ball.vx = 0;
          ball.vy = 0;
        }

        // Update position
        if (ball.vx !== 0 || ball.vy !== 0) {
          allStationary = false;
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Wall collisions
          if (ball.x <= this.BALL_RADIUS || ball.x >= this.TABLE_WIDTH - this.BALL_RADIUS) {
            ball.vx = -ball.vx;
            ball.x = Math.max(this.BALL_RADIUS, Math.min(this.TABLE_WIDTH - this.BALL_RADIUS, ball.x));
          }
          if (ball.y <= this.BALL_RADIUS || ball.y >= this.TABLE_HEIGHT - this.BALL_RADIUS) {
            ball.vy = -ball.vy;
            ball.y = Math.max(this.BALL_RADIUS, Math.min(this.TABLE_HEIGHT - this.BALL_RADIUS, ball.y));
          }
        }
      }

      // Ball-to-ball collisions
      for (let i = 0; i < updatedBalls.length; i++) {
        for (let j = i + 1; j < updatedBalls.length; j++) {
          const ball1 = updatedBalls[i];
          const ball2 = updatedBalls[j];
          
          if (ball1.potted || ball2.potted) continue;

          const dx = ball2.x - ball1.x;
          const dy = ball2.y - ball1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < this.BALL_RADIUS * 2) {
            // Simple collision response
            const angle = Math.atan2(dy, dx);
            const targetX = ball1.x + Math.cos(angle) * (this.BALL_RADIUS * 2);
            const targetY = ball1.y + Math.sin(angle) * (this.BALL_RADIUS * 2);
            
            const ax = (targetX - ball2.x) * 0.05;
            const ay = (targetY - ball2.y) * 0.05;
            
            ball1.vx -= ax;
            ball1.vy -= ay;
            ball2.vx += ax;
            ball2.vy += ay;
          }
        }
      }

      // Check for potted balls
      for (const ball of updatedBalls) {
        if (ball.potted) continue;
        
        for (const pocket of this.POCKET_POSITIONS) {
          const dx = ball.x - pocket.x;
          const dy = ball.y - pocket.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 20) { // Pocket radius
            ball.potted = true;
            ball.visible = false;
            ball.vx = 0;
            ball.vy = 0;
          }
        }
      }

      if (allStationary) break;
    }

    return updatedBalls;
  }

  evaluateShot(oldBalls: Ball[], newBalls: Ball[]): { continueTurn: boolean; pottedBalls: Ball[]; foul: boolean } {
    const pottedBalls = newBalls.filter((ball, index) => 
      !oldBalls[index].potted && ball.potted
    );

    const cueBallPotted = pottedBalls.some(ball => ball.type === 'cue');
    const eightBallPotted = pottedBalls.some(ball => ball.type === '8ball');
    
    // Basic foul detection
    const foul = cueBallPotted || (eightBallPotted && pottedBalls.length > 1);
    
    // Continue turn if any non-cue balls were potted and no foul
    const continueTurn = pottedBalls.length > 0 && !foul && !cueBallPotted;

    return {
      continueTurn,
      pottedBalls,
      foul
    };
  }

  checkGameEnd(balls: Ball[], players: any[]): { gameEnded: boolean; winner?: string } {
    const visibleBalls = balls.filter(ball => ball.visible && ball.type !== 'cue');
    const eightBall = balls.find(ball => ball.type === '8ball');
    
    if (!eightBall?.visible) {
      // 8-ball was potted - determine winner based on game rules
      return { gameEnded: true, winner: 'player1' }; // Simplified
    }

    // Check if either player has no balls left
    const solidBalls = visibleBalls.filter(ball => ball.type === 'solid');
    const stripeBalls = visibleBalls.filter(ball => ball.type === 'stripe');

    if (solidBalls.length === 0 || stripeBalls.length === 0) {
      // One player has cleared all their balls
      return { gameEnded: false }; // They still need to sink the 8-ball
    }

    return { gameEnded: false };
  }
}
