import * as dotenv from 'dotenv';
import { InitConfig } from '../core/config.mjs';
import { InitLogger } from '../core/logger.mjs';
import { InitDatabase, CreateTables, MigrateDatabase } from '../core/database.mjs';

dotenv.config();
InitConfig();
InitLogger();

(async () => {
    await InitDatabase();

    await CreateTables();

    await MigrateDatabase();

})();