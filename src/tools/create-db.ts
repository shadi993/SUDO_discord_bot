import * as dotenv from 'dotenv';
import { InitConfig } from '../core/config.ts';
import { InitLogger } from '../core/logger.ts';
import { InitDatabase, CreateTables } from '../core/database.ts';

dotenv.config();
InitConfig();
InitLogger();

const wipe = process.argv.includes('--wipe');

await InitDatabase();
await CreateTables(wipe);
