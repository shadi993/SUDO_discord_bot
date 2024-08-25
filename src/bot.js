import { config } from 'dotenv';
import { InitCommands } from './commands/init.mjs';
import { InitLogger } from './core/logger.mjs';
import { InitDiscordClient, DiscordClient } from './core/discord-client.mjs';

config();
InitLogger();
InitDiscordClient();
InitCommands(DiscordClient);
