import { Sequelize } from 'sequelize-typescript';
import { Config } from './config.js';
import { CreateLogger, Logger } from './logger.js';
import { PostCountDboEntity } from '../modules/models/postCountDboEntity.model.js';
import { RoleOption, RoleSelectionPromt } from '../modules/models/roleSelectionPrompt.model.js';

var SequelizeDb : Sequelize;
var DatabaseLogger : typeof Logger;

/**
 * Initialize the database connection.
 */
export const InitDatabase = async () => {
    DatabaseLogger = CreateLogger('Database', Config.database.log_level);

    DatabaseLogger.log('debug', 'Creating database instance...');
    SequelizeDb = new Sequelize(Config.database.connection_string, {
        logging: (...msg) => DatabaseLogger.log('trace', msg),
        models: [PostCountDboEntity, RoleOption, RoleSelectionPromt],
        pool: {
            max: 1,
            min: 0,
            acquire: 30000,
            idle: 10000
          }
    });

    DatabaseLogger.log('info', 'Connecting to the database...');
    try {
        await SequelizeDb.authenticate();
        DatabaseLogger.log('info', 'Connection has been established successfully.');
    } catch (error) {
        DatabaseLogger.log('error', 'Unable to connect to the database:', error);
        throw error;
    }

    /*PostCountDboEntity.init(
        {
            discord_id: {
                // TODO: BIGINT does not seem to work with sqlite and discord id's??
                type: DataTypes.STRING,
                primaryKey: true,
            },
            xp: DataTypes.BIGINT,
        },
        { sequelize: SequelizeDb, modelName: 'DiscordUserXp' },
    );*/
}

/**
 * Create tables in the database.
 * @param {boolean} wipe - Whether to wipe the tables before (re)creating them.
 *                         Warning: This will delete all data!
 */
export const CreateTables = async (wipe = false) => {
    DatabaseLogger.log('info', 'Creating tables...');
    await SequelizeDb.sync({ force: wipe });
    DatabaseLogger.log('info', 'Done creating tables...');
}
