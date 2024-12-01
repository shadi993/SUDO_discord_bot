import { Sequelize, DataTypes, Model } from 'sequelize';
import { Config } from './config.mjs';
import { CreateLogger } from './logger.mjs';

var SequelizeDb;
var DatabaseLogger;

export class PostCountDboEntity extends Model { }

/**
 * Initialize the database connection.
 */
export const InitDatabase = async () => {
    DatabaseLogger = CreateLogger('Database', Config.database.log_level);

    DatabaseLogger.log('debug', 'Creating database instance...');
    SequelizeDb = new Sequelize(Config.database.connection_string, {
        logging: (...msg) => DatabaseLogger.log('trace', msg)
    });

    DatabaseLogger.log('info', 'Connecting to the database...');
    try {
        await SequelizeDb.authenticate();
        DatabaseLogger.log('info', 'Connection has been established successfully.');
    } catch (error) {
        DatabaseLogger.log('error', 'Unable to connect to the database:', error);
        throw error;
    }

    PostCountDboEntity.init(
        {
            discord_id: {
                // TODO: BIGINT does not seem to work with sqlite and discord id's??
                type: DataTypes.STRING,
                primaryKey: true,
            },
            xp: DataTypes.BIGINT,
            points: DataTypes.BIGINT
        },
        { sequelize: SequelizeDb, modelName: 'DiscordUserXp' },
    );
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

/**
 * Migrate the tables in the database
 * 
 * This will run SQL commands to modify the tables since the original two
 * column DiscordUserXp table
 */
export const MigrateTables = async () => {
    DatabaseLogger.log('info', 'Migrating tables')
    // Add points column to DiscordUserXps
    const [results, metadata] = await SequelizeDb.query(
        'alter table "DiscordUserXps" add column if not exists points bigint default 0;');
    DatabaseLogger.log('info', 'Finished migrating schema')
}