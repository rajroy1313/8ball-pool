import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  discordId: text("discord_id").notNull().unique(),
  password: text("password").notNull(),
});

export const gameRooms = pgTable("game_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  discordChannelId: text("discord_channel_id").notNull(),
  discordVoiceChannelId: text("discord_voice_channel_id"),
  status: text("status").notNull().default("waiting"), // waiting, active, finished
  maxPlayers: integer("max_players").notNull().default(2),
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  gameRoomId: varchar("game_room_id").references(() => gameRooms.id).notNull(),
  ballType: text("ball_type"), // stripes, solids, or null
  score: integer("score").default(7), // balls remaining
  isCurrentPlayer: boolean("is_current_player").default(false),
  isMuted: boolean("is_muted").default(false),
});

export const gameStates = pgTable("game_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameRoomId: varchar("game_room_id").references(() => gameRooms.id).notNull().unique(),
  balls: json("balls").$type<Ball[]>().notNull(), // Array of ball positions and states
  cuePosition: json("cue_position").$type<{x: number, y: number, angle: number}>(),
  shotPower: integer("shot_power").default(0),
  timeLeft: integer("time_left").default(150), // seconds
  gamePhase: text("game_phase").default("aiming"), // aiming, shooting, waiting
  lastShotResult: text("last_shot_result"), // pot, miss, foul
});

// TypeScript types for game objects
export type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  type: 'solid' | 'stripe' | 'cue' | '8ball';
  potted: boolean;
  visible: boolean;
};

export type GameMessage = {
  type: 'gameUpdate' | 'playerJoin' | 'playerLeave' | 'turnChange' | 'gameEnd' | 'voiceUpdate';
  payload: any;
  timestamp: number;
};

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  discordId: true,
  password: true,
});

export const insertGameRoomSchema = createInsertSchema(gameRooms).pick({
  name: true,
  discordChannelId: true,
  discordVoiceChannelId: true,
});

export const insertPlayerSchema = createInsertSchema(players).pick({
  userId: true,
  gameRoomId: true,
});

// Inferred types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGameRoom = z.infer<typeof insertGameRoomSchema>;
export type GameRoom = typeof gameRooms.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;
export type GameState = typeof gameStates.$inferSelect;
