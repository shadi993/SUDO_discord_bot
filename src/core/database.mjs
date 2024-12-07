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
            points: DataTypes.BIGINT,
            last_daily_claim: DataTypes.DATE
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
    DatabaseLogger.log('info', 'Migrating tables');
    try {
        const [results] = await SequelizeDb.query(`
            PRAGMA table_info("DiscordUserXps");
        `);

        const columnExists = results.some(column => column.name === 'points');
        const lastDailyClaimExists = results.some(column => column.name === 'last_daily_claim');

        if (!columnExists || !lastDailyClaimExists) {
            const queries = [];
            if (!columnExists) {
                queries.push(`ALTER TABLE "DiscordUserXps" ADD COLUMN points BIGINT DEFAULT 0;`);
            }
            if (!lastDailyClaimExists) {
                queries.push(`ALTER TABLE "DiscordUserXps" ADD COLUMN last_daily_claim DATE;`);
            }
            for (const query of queries) {
                await SequelizeDb.query(query);
            }
            DatabaseLogger.log('info', `Columns ${!columnExists ? '"points"' : ''} ${!lastDailyClaimExists ? '"last_daily_claim"' : ''} added to "DiscordUserXps" table.`);
        } else {
            DatabaseLogger.log('info', 'Columns "points" and "last_daily_claim" already exist in "DiscordUserXps" table.');
        }
    } catch (error) {
        DatabaseLogger.log('error', 'Error during table migration:', error);
        throw error;
    }

    DatabaseLogger.log('info', 'Finished migrating schema');
};
