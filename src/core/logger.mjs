import log4js from 'log4js';
import { Config } from '../core/config.mjs';

export var Logger;

/**
 * Initialize the default global logger.
 * This should be called once at the start of the application.
 * The log level is set to the value of the `logger.log_level` in the config.json
 */
export const InitLogger = () => {
    Logger = log4js.getLogger()
    Logger.level = Config.general.log_level || 'info';
}

/**
 * Create a logger with the specified name.
 * The log level is set to the value of the `logger.log_level` in the config.json
 * @param {string} name - The name of the logger.
 * @param {string} default_log_level - The default log level to use if none is specified in the config.
 * @returns {Logger} The logger instance.
 */
export const CreateLogger = (name, default_log_level = Config.general.log_level) => {
    var logger = log4js.getLogger(name);
    logger.level = default_log_level;
    return logger;
}
