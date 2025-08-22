import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, CommandInteraction, VoiceState } from 'discord.js';
import { storage } from '../storage';

export async function initializeDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn('Discord bot token not provided. Bot functionality will be disabled.');
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  // Define slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName('pool-start')
      .setDescription('Start a new 8-ball pool game')
      .addChannelOption(option =>
        option.setName('voice-channel')
          .setDescription('Voice channel for the game')
          .setRequired(false)
      ),
    
    new SlashCommandBuilder()
      .setName('pool-join')
      .setDescription('Join an existing pool game'),
    
    new SlashCommandBuilder()
      .setName('pool-status')
      .setDescription('Check the status of the current pool game'),
    
    new SlashCommandBuilder()
      .setName('pool-forfeit')
      .setDescription('Forfeit the current game'),
  ];

  client.once('ready', async () => {
    console.log(`Discord bot logged in as ${client.user?.tag}`);
    
    // Register slash commands
    const rest = new REST().setToken(token);
    try {
      await rest.put(
        Routes.applicationCommands(client.user!.id),
        { body: commands.map(command => command.toJSON()) },
      );
      console.log('Discord slash commands registered successfully');
    } catch (error) {
      console.error('Failed to register Discord commands:', error);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      switch (interaction.commandName) {
        case 'pool-start':
          await handleStartGame(interaction);
          break;
        case 'pool-join':
          await handleJoinGame(interaction);
          break;
        case 'pool-status':
          await handleGameStatus(interaction);
          break;
        case 'pool-forfeit':
          await handleForfeit(interaction);
          break;
      }
    } catch (error) {
      console.error('Discord command error:', error);
      await interaction.reply({ content: 'An error occurred while processing the command.', ephemeral: true });
    }
  });

  client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
    // Handle voice activity changes for game participants
    const userId = newState.id;
    const user = await storage.getUserByDiscordId(userId);
    
    if (user) {
      // Find active games for this user
      // This is a simplified version - in production you'd want more sophisticated tracking
      console.log(`Voice state changed for user ${user.username}`);
    }
  });

  await client.login(token);
  return client;
}

async function handleStartGame(interaction: CommandInteraction) {
  const channelId = interaction.channelId;
  const voiceChannel = interaction.options.getChannel('voice-channel');
  
  // Check if there's already an active game in this channel
  const existingRoom = await storage.getGameRoomByChannelId(channelId);
  if (existingRoom && existingRoom.status === 'active') {
    await interaction.reply('There\'s already an active pool game in this channel!');
    return;
  }

  // Create new game room
  const gameRoom = await storage.createGameRoom({
    name: `Pool Game - ${interaction.guild?.name}`,
    discordChannelId: channelId,
    discordVoiceChannelId: voiceChannel?.id || null,
  });

  const gameUrl = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/game/${gameRoom.id}`;
  
  await interaction.reply({
    content: `🎱 **New 8-Ball Pool Game Started!**\n\n` +
             `🌐 **Play here:** ${gameUrl}\n` +
             `👥 **Players:** 0/2\n` +
             `${voiceChannel ? `🔊 **Voice Channel:** ${voiceChannel.name}` : '🔇 **No voice channel selected**'}\n\n` +
             `Use \`/pool-join\` to join the game!`,
    components: []
  });
}

async function handleJoinGame(interaction: CommandInteraction) {
  const channelId = interaction.channelId;
  const discordUser = interaction.user;

  const gameRoom = await storage.getGameRoomByChannelId(channelId);
  if (!gameRoom) {
    await interaction.reply({ content: 'No active pool game in this channel. Use `/pool-start` to create one!', ephemeral: true });
    return;
  }

  // Check if user exists, create if not
  let user = await storage.getUserByDiscordId(discordUser.id);
  if (!user) {
    user = await storage.createUser({
      username: discordUser.displayName || discordUser.username,
      discordId: discordUser.id,
      password: 'discord_auth', // Placeholder for Discord auth
    });
  }

  const existingPlayers = await storage.getPlayersByGameRoom(gameRoom.id);
  if (existingPlayers.some(p => p.userId === user.id)) {
    await interaction.reply({ content: 'You\'re already in this game!', ephemeral: true });
    return;
  }

  if (existingPlayers.length >= 2) {
    await interaction.reply({ content: 'This game is full!', ephemeral: true });
    return;
  }

  await storage.addPlayerToRoom({
    userId: user.id,
    gameRoomId: gameRoom.id,
  });

  const gameUrl = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/game/${gameRoom.id}`;
  
  await interaction.reply(`🎱 You've joined the pool game! Play here: ${gameUrl}`);

  // If game is now full, announce game start
  const allPlayers = await storage.getPlayersByGameRoom(gameRoom.id);
  if (allPlayers.length === 2) {
    await storage.updateGameRoomStatus(gameRoom.id, 'active');
    
    const channel = interaction.channel;
    if (channel && 'send' in channel) {
      await channel.send('🎱 **Game Starting!** Both players have joined. Good luck!');
    }
  }
}

async function handleGameStatus(interaction: CommandInteraction) {
  const channelId = interaction.channelId;
  
  const gameRoom = await storage.getGameRoomByChannelId(channelId);
  if (!gameRoom) {
    await interaction.reply({ content: 'No pool game in this channel.', ephemeral: true });
    return;
  }

  const players = await storage.getPlayersByGameRoom(gameRoom.id);
  const gameState = await storage.getGameState(gameRoom.id);
  
  let statusMessage = `🎱 **Pool Game Status**\n\n`;
  statusMessage += `📊 **Status:** ${gameRoom.status}\n`;
  statusMessage += `👥 **Players:** ${players.length}/2\n`;
  
  if (gameState) {
    const currentPlayer = players.find(p => p.isCurrentPlayer);
    if (currentPlayer) {
      const user = await storage.getUser(currentPlayer.userId);
      statusMessage += `🎯 **Current Turn:** ${user?.username || 'Unknown'}\n`;
    }
    statusMessage += `⏱️ **Time Left:** ${Math.floor((gameState.timeLeft || 0) / 60)}:${((gameState.timeLeft || 0) % 60).toString().padStart(2, '0')}\n`;
  }

  const gameUrl = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/game/${gameRoom.id}`;
  statusMessage += `\n🌐 **Game Link:** ${gameUrl}`;

  await interaction.reply(statusMessage);
}

async function handleForfeit(interaction: CommandInteraction) {
  const channelId = interaction.channelId;
  const discordUser = interaction.user;

  const gameRoom = await storage.getGameRoomByChannelId(channelId);
  if (!gameRoom) {
    await interaction.reply({ content: 'No active pool game in this channel.', ephemeral: true });
    return;
  }

  const user = await storage.getUserByDiscordId(discordUser.id);
  if (!user) {
    await interaction.reply({ content: 'You\'re not registered in any games.', ephemeral: true });
    return;
  }

  const players = await storage.getPlayersByGameRoom(gameRoom.id);
  const playerInGame = players.find(p => p.userId === user.id);
  
  if (!playerInGame) {
    await interaction.reply({ content: 'You\'re not in this game.', ephemeral: true });
    return;
  }

  // End the game
  await storage.updateGameRoomStatus(gameRoom.id, 'finished');
  
  await interaction.reply(`🏳️ ${user.username} has forfeited the game. Game ended.`);
}
