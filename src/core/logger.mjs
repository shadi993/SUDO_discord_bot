import log4js from 'log4js';

export var Logger;

export const InitLogger = () => {
    Logger = log4js.getLogger()
    Logger.level = process.env.LOG_LEVEL || 'info';
}

export const CreateLogger = (name) => {
    var logger = log4js.getLogger(name);
    logger.level = process.env.LOG_LEVEL || 'info';
    return logger;
}
