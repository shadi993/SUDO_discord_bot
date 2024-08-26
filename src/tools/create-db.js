import * as dotenv from 'dotenv';
import { InitConfig } from '../core/config.mjs';
import { InitLogger } from '../core/logger.mjs';
import { InitDatabase, CreateTables } from '../core/database.mjs';

dotenv.config();
InitConfig();
InitLogger();

const wipe = process.argv.includes('--wipe');

await InitDatabase();
await CreateTables(wipe);
