import * as dotenv from 'dotenv';
import { InitConfig } from './core/config.mjs';
import { InitCommands } from './commands/init.mjs';
import { InitLogger } from './core/logger.mjs';
import { InitDatabase } from './core/database.mjs';
import { InitDiscordClient, RegisterDiscordModule, DiscordClient } from './core/discord-client.mjs';
import { LevelingModule } from './modules/leveling.mjs';
import { DisboardModule } from "./modules/disboard.mjs";
import { RolesModule } from './modules/roles.mjs';
import { NotifyModule } from './modules/notify.mjs';
import { AutoRole } from './modules/autoRole.mjs';
import { AutoKick } from './modules/autoKick.mjs';
import { PersistentMessage } from './modules/persistentMessage.mjs';

dotenv.config();
InitConfig();
InitLogger();
await InitDatabase();
InitDiscordClient();
RegisterDiscordModule(new NotifyModule());
RegisterDiscordModule(new LevelingModule());
RegisterDiscordModule(new DisboardModule());
RegisterDiscordModule(new RolesModule());
RegisterDiscordModule(new AutoRole());
RegisterDiscordModule(new AutoKick());
RegisterDiscordModule(new PersistentMessage());
InitCommands(DiscordClient);
