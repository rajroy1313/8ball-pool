import { type User, type InsertUser, type GameRoom, type InsertGameRoom, type Player, type InsertPlayer, type GameState, type Ball, type GameMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Game room methods
  getGameRoom(id: string): Promise<GameRoom | undefined>;
  getGameRoomByChannelId(channelId: string): Promise<GameRoom | undefined>;
  createGameRoom(gameRoom: InsertGameRoom): Promise<GameRoom>;
  updateGameRoomStatus(id: string, status: string): Promise<void>;
  getAllActiveGameRooms(): Promise<GameRoom[]>;

  // Player methods
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayersByGameRoom(gameRoomId: string): Promise<Player[]>;
  addPlayerToRoom(player: InsertPlayer): Promise<Player>;
  removePlayerFromRoom(playerId: string): Promise<void>;
  updatePlayerMuteStatus(playerId: string, isMuted: boolean): Promise<void>;
  setCurrentPlayer(gameRoomId: string, playerId: string): Promise<void>;

  // Game state methods
  getGameState(gameRoomId: string): Promise<GameState | undefined>;
  updateGameState(gameRoomId: string, balls: Ball[], cuePosition?: any, shotPower?: number, timeLeft?: number, gamePhase?: string): Promise<void>;
  createGameState(gameRoomId: string, initialBalls: Ball[]): Promise<GameState>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private gameRooms: Map<string, GameRoom> = new Map();
  private players: Map<string, Player> = new Map();
  private gameStates: Map<string, GameState> = new Map();

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.discordId === discordId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Game room methods
  async getGameRoom(id: string): Promise<GameRoom | undefined> {
    return this.gameRooms.get(id);
  }

  async getGameRoomByChannelId(channelId: string): Promise<GameRoom | undefined> {
    return Array.from(this.gameRooms.values()).find(room => room.discordChannelId === channelId);
  }

  async createGameRoom(insertGameRoom: InsertGameRoom): Promise<GameRoom> {
    const id = randomUUID();
    const gameRoom: GameRoom = {
      ...insertGameRoom,
      id,
      status: "waiting",
      maxPlayers: 2,
      createdAt: new Date(),
    };
    this.gameRooms.set(id, gameRoom);
    return gameRoom;
  }

  async updateGameRoomStatus(id: string, status: string): Promise<void> {
    const room = this.gameRooms.get(id);
    if (room) {
      room.status = status;
      this.gameRooms.set(id, room);
    }
  }

  async getAllActiveGameRooms(): Promise<GameRoom[]> {
    return Array.from(this.gameRooms.values()).filter(room => room.status === "active");
  }

  // Player methods
  async getPlayer(id: string): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayersByGameRoom(gameRoomId: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(player => player.gameRoomId === gameRoomId);
  }

  async addPlayerToRoom(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const player: Player = {
      ...insertPlayer,
      id,
      ballType: null,
      score: 7,
      isCurrentPlayer: false,
      isMuted: false,
    };
    this.players.set(id, player);
    return player;
  }

  async removePlayerFromRoom(playerId: string): Promise<void> {
    this.players.delete(playerId);
  }

  async updatePlayerMuteStatus(playerId: string, isMuted: boolean): Promise<void> {
    const player = this.players.get(playerId);
    if (player) {
      player.isMuted = isMuted;
      this.players.set(playerId, player);
    }
  }

  async setCurrentPlayer(gameRoomId: string, playerId: string): Promise<void> {
    const players = await this.getPlayersByGameRoom(gameRoomId);
    players.forEach(player => {
      player.isCurrentPlayer = player.id === playerId;
      this.players.set(player.id, player);
    });
  }

  // Game state methods
  async getGameState(gameRoomId: string): Promise<GameState | undefined> {
    return Array.from(this.gameStates.values()).find(state => state.gameRoomId === gameRoomId);
  }

  async createGameState(gameRoomId: string, initialBalls: Ball[]): Promise<GameState> {
    const id = randomUUID();
    const gameState: GameState = {
      id,
      gameRoomId,
      balls: initialBalls,
      cuePosition: null,
      shotPower: 0,
      timeLeft: 150,
      gamePhase: "aiming",
      lastShotResult: null,
    };
    this.gameStates.set(id, gameState);
    return gameState;
  }

  async updateGameState(
    gameRoomId: string, 
    balls: Ball[], 
    cuePosition?: any, 
    shotPower?: number, 
    timeLeft?: number, 
    gamePhase?: string
  ): Promise<void> {
    const existingState = await this.getGameState(gameRoomId);
    if (existingState) {
      existingState.balls = balls;
      if (cuePosition !== undefined) existingState.cuePosition = cuePosition;
      if (shotPower !== undefined) existingState.shotPower = shotPower;
      if (timeLeft !== undefined) existingState.timeLeft = timeLeft;
      if (gamePhase !== undefined) existingState.gamePhase = gamePhase;
      this.gameStates.set(existingState.id, existingState);
    }
  }
}

export const storage = new MemStorage();
