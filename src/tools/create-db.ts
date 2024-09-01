import * as dotenv from 'dotenv';
import { InitConfig } from '../core/config.js';
import { InitLogger } from '../core/logger.js';
import { InitDatabase, CreateTables } from '../core/database.js';

dotenv.config();
InitConfig();
InitLogger();

const wipe = process.argv.includes('--wipe');

await InitDatabase();
await CreateTables(wipe);
