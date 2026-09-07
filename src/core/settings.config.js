import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Runtime settings that are not bot feature configuration.
 * Database values are intentionally read only from .env.
 */
export const Settings = {
    general: {
        environment: process.env.NODE_ENV || 'development',
        log_level: process.env.LOG_LEVEL || 'debug'
    },
    database: {
        log_level: process.env.DATABASE_LOG_LEVEL,
        connection_string_a: process.env.DATABASE_CONNECTION_STRING_A,
        connection_string_b: process.env.DATABASE_CONNECTION_STRING_B,
        connection_string: process.env.DATABASE_CONNECTION_STRING
    }
};
