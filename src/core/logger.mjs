import log4js from 'log4js';
import { Config } from '../core/config.mjs';

export var Logger;

export const InitLogger = () => {
    Logger = log4js.getLogger()
    Logger.level = Config.log_level || 'info';
}

export const CreateLogger = (name) => {
    var logger = log4js.getLogger(name);
    logger.level = Config.log_level || 'info';
    return logger;
}
