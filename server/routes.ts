import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { initializeDiscordBot } from "./services/discord-bot";
import { GameEngine } from "./services/game-engine";
import { insertGameRoomSchema, insertPlayerSchema, type GameMessage } from "@shared/schema";

const gameEngine = new GameEngine();
const connectedClients = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Discord bot
  const discordBot = await initializeDiscordBot();

  // Game room routes
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await storage.getAllActiveGameRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const validatedData = insertGameRoomSchema.parse(req.body);
      const room = await storage.createGameRoom(validatedData);
      
      // Initialize game state with default ball positions
      const initialBalls = gameEngine.createInitialBallLayout();
      await storage.createGameState(room.id, initialBalls);
      
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: "Invalid room data" });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.getGameRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  // Player routes
  app.post("/api/rooms/:roomId/join", async (req, res) => {
    try {
      const { userId } = req.body;
      const roomId = req.params.roomId;
      
      const room = await storage.getGameRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const existingPlayers = await storage.getPlayersByGameRoom(roomId);
      if (existingPlayers.length >= room.maxPlayers) {
        return res.status(400).json({ message: "Room is full" });
      }

      const player = await storage.addPlayerToRoom({ userId, gameRoomId: roomId });
      
      // Set as current player if first player
      if (existingPlayers.length === 0) {
        await storage.setCurrentPlayer(roomId, player.id);
      }

      // Start game if room is full
      if (existingPlayers.length + 1 === room.maxPlayers) {
        await storage.updateGameRoomStatus(roomId, "active");
      }

      // Broadcast player join
      broadcastToRoom(roomId, {
        type: 'playerJoin',
        payload: { player },
        timestamp: Date.now()
      });

      res.json(player);
    } catch (error) {
      res.status(400).json({ message: "Failed to join room" });
    }
  });

  app.get("/api/rooms/:roomId/players", async (req, res) => {
    try {
      const players = await storage.getPlayersByGameRoom(req.params.roomId);
      res.json(players);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  // Game state routes
  app.get("/api/rooms/:roomId/state", async (req, res) => {
    try {
      const gameState = await storage.getGameState(req.params.roomId);
      if (!gameState) {
        return res.status(404).json({ message: "Game state not found" });
      }
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game state" });
    }
  });

  app.post("/api/rooms/:roomId/shoot", async (req, res) => {
    try {
      const { power, angle, playerId } = req.body;
      const roomId = req.params.roomId;

      const gameState = await storage.getGameState(roomId);
      if (!gameState) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Validate it's the player's turn
      const player = await storage.getPlayer(playerId);
      if (!player?.isCurrentPlayer) {
        return res.status(403).json({ message: "Not your turn" });
      }

      // Simulate shot using game engine
      const updatedBalls = gameEngine.simulateShot(gameState.balls, power, angle);
      const shotResult = gameEngine.evaluateShot(gameState.balls, updatedBalls);

      await storage.updateGameState(roomId, updatedBalls, null, 0, 150, "waiting");

      // Switch turns if needed
      if (!shotResult.continueTurn) {
        const players = await storage.getPlayersByGameRoom(roomId);
        const nextPlayer = players.find(p => p.id !== playerId);
        if (nextPlayer) {
          await storage.setCurrentPlayer(roomId, nextPlayer.id);
        }
      }

      // Broadcast game update
      broadcastToRoom(roomId, {
        type: 'gameUpdate',
        payload: { gameState: await storage.getGameState(roomId), shotResult },
        timestamp: Date.now()
      });

      res.json({ success: true, shotResult });
    } catch (error) {
      res.status(500).json({ message: "Failed to process shot" });
    }
  });

  // Voice control routes
  app.post("/api/rooms/:roomId/voice/mute", async (req, res) => {
    try {
      const { playerId, muted } = req.body;
      await storage.updatePlayerMuteStatus(playerId, muted);
      
      broadcastToRoom(req.params.roomId, {
        type: 'voiceUpdate',
        payload: { playerId, muted },
        timestamp: Date.now()
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update voice status" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    
    if (!roomId) {
      ws.close(1008, 'Room ID required');
      return;
    }

    const clientId = `${roomId}_${Date.now()}`;
    connectedClients.set(clientId, ws);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'aim':
            // Update cue position in real-time
            await storage.updateGameState(roomId, [], data.payload.cuePosition);
            broadcastToRoom(roomId, {
              type: 'gameUpdate',
              payload: { cuePosition: data.payload.cuePosition },
              timestamp: Date.now()
            });
            break;
            
          case 'powerChange':
            await storage.updateGameState(roomId, [], undefined, data.payload.power);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(clientId);
    });
  });

  function broadcastToRoom(roomId: string, message: GameMessage) {
    connectedClients.forEach((ws, clientId) => {
      if (clientId.startsWith(roomId) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}
