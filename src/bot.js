import * as dotenv from 'dotenv';
import { InitConfig } from './core/config.mjs';
import { InitCommands } from './commands/init.mjs';
import { InitLogger } from './core/logger.mjs';
import { InitDiscordClient, RegisterDiscordModule, DiscordClient } from './core/discord-client.mjs';
import { LevelingModule } from './modules/leveling.mjs';
import { DisboardModule } from "./modules/disboard.mjs";
import { RolesModule } from './modules/roles.mjs';

dotenv.config();
InitConfig();
InitLogger();
InitDiscordClient();
RegisterDiscordModule(new LevelingModule());
RegisterDiscordModule(new DisboardModule());
RegisterDiscordModule(new RolesModule());
InitCommands(DiscordClient);
