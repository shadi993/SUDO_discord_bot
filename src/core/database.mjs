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
            xp: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            points: {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,  
            },
        },
        { sequelize: SequelizeDb, modelName: 'DiscordUserXp' },
    );
    await SequelizeDb.sync(); 
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

export const MigrateDatabase = async () => {
    DatabaseLogger.log('info', 'Migrating the database...');

    const queryInterface = SequelizeDb.getQueryInterface();

    const tableExists = await queryInterface.showAllTables()
        .then(tables => tables.includes('DiscordUserXp'));

    if (tableExists) {
        const tableDescription = await queryInterface.describeTable('DiscordUserXp');
        
        const pointsExists = 'points' in tableDescription;
        const typeExists = 'type' in tableDescription;

        if (!pointsExists) {
            await queryInterface.addColumn('DiscordUserXp', 'points', {
                type: DataTypes.BIGINT,
                allowNull: false,
                defaultValue: 0,
            });
            DatabaseLogger.log('info', 'Added points column to DiscordUserXp.');
        } else {
            DatabaseLogger.log('info', 'Points column already exists in DiscordUserXp.');
        }

        if (typeExists) {
            await queryInterface.removeColumn('DiscordUserXp', 'type');
            DatabaseLogger.log('info', 'Removed type column from DiscordUserXp.');
        } else {
            DatabaseLogger.log('info', 'Type column does not exist in DiscordUserXp.');
        }
    } else {
        await PostCountDboEntity.init(
            {
                discord_id: {
                    type: DataTypes.STRING,
                    primaryKey: true,
                },
                xp: DataTypes.BIGINT,
                points: {
                    type: DataTypes.BIGINT,
                    allowNull: false,
                    defaultValue: 0,
                },
            },
            { sequelize: SequelizeDb, modelName: 'DiscordUserXp' }
        );
        await SequelizeDb.sync(); 
        DatabaseLogger.log('info', 'DiscordUserXp table created with initial columns.');
    }

    DatabaseLogger.log('info', 'Database migration complete.');
};


export { SequelizeDb };