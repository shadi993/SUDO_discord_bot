import { config } from 'dotenv';
import { InitCommands } from './commands/init.mjs';
import { InitLogger } from './core/logger.mjs';
import { InitDiscordClient, RegisterDiscordModule, DiscordClient } from './core/discord-client.mjs';
import { LevelingModule } from './modules/leveling.mjs';

config();
InitLogger();
InitDiscordClient();
RegisterDiscordModule(new LevelingModule());
InitCommands(DiscordClient);
