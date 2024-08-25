import log4js from 'log4js';

export var Logger;

export const InitLogger = () => {
    Logger = log4js.getLogger();
    Logger.level = process.env.LOG_LEVEL || 'info';
}
