# Overview

This is a Discord-integrated 8-ball pool game application that combines real-time multiplayer gameplay with Discord bot functionality. Players can create and join pool games through Discord commands, with the web interface providing an interactive canvas-based game experience. The application features real-time game state synchronization, voice controls integration, and comprehensive game statistics tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React with TypeScript**: Single-page application using React 18 with TypeScript for type safety
- **Vite Build System**: Modern build tool with hot module replacement for development
- **Tailwind CSS + shadcn/ui**: Utility-first CSS framework with pre-built accessible components
- **Canvas-based Game Rendering**: HTML5 Canvas for real-time 8-ball pool game visualization and physics
- **Client-side Routing**: Wouter library for lightweight routing between game pages

## Backend Architecture
- **Express.js Server**: Node.js web server handling HTTP requests and WebSocket connections
- **WebSocket Real-time Communication**: Bidirectional communication for live game state updates
- **Memory Storage Layer**: In-memory data storage with interface abstraction for future database integration
- **Game Engine**: Custom physics engine for ball movement, collision detection, and game rule enforcement
- **Modular Service Architecture**: Separate services for Discord bot and game logic

## Data Storage Solutions
- **PostgreSQL with Drizzle ORM**: Relational database with type-safe query builder and schema migrations
- **Memory Storage Fallback**: In-memory storage implementation for development and testing
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

## Authentication and Authorization
- **Discord OAuth Integration**: Authentication through Discord accounts
- **Session-based Authentication**: Server-side sessions with PostgreSQL storage
- **Player Authorization**: Game room access control and player permissions

## External Dependencies
- **Discord.js**: Official Discord API library for bot functionality and user authentication
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **React Query (TanStack Query)**: Server state management with caching and synchronization
- **Radix UI**: Headless UI components for accessibility and consistent design
- **Canvas API**: Browser-native graphics rendering for game visualization
- **WebSocket API**: Real-time bidirectional communication protocol