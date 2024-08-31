import { Config } from './config.ts';
import { CreateLogger, Logger } from './logger.ts';
import { Column, Table, Model, Sequelize, DataType, AllowNull } from 'sequelize-typescript';

var SequelizeDb : Sequelize;
var DatabaseLogger : typeof Logger;

@Table
export class PostCountDboEntity extends Model { 
    @Column(DataType.TEXT)
    discord_id: string = "";
    
    @Column(DataType.BIGINT)
    xp: number = 0;
}

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
