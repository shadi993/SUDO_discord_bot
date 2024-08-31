import * as fs from 'node:fs';

/**
 * The configuration object as loaded from the config.json file.
 */
export var Config : any;

/**
 * Load the configuration from the config.json file.
 */
export const InitConfig = () => {
    Config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

    if (!Config) {
        throw new Error('Config must be an object.');
    }
}
