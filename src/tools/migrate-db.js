import * as dotenv from 'dotenv';
import { InitConfig } from '../core/config.mjs';
import { InitLogger } from '../core/logger.mjs';
import { InitDatabase, MigrateTables } from '../core/database.mjs';

dotenv.config();
InitConfig();
InitLogger();

await InitDatabase();
await MigrateTables();
