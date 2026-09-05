import * as fs from 'node:fs';

/**
 * The configuration object as loaded from the config.json file.
 */
export var Config;

/**
 * Load the configuration from the config.json file.
 */
export const InitConfig = () => {
    Config = JSON.parse(fs.readFileSync('config.json'));

    if (!Config) {
        throw new Error('Config must be an object.');
    }
}

/**
 * Keep the live config object in sync after a dashboard save.
 * Modules import this object by reference and read settings while handling events.
 */
export const UpdateConfig = (nextConfig) => {
    if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) {
        throw new Error('Config must be an object.');
    }

    if (Config) {
        for (const key of Object.keys(Config)) delete Config[key];
        Object.assign(Config, nextConfig);
    } else {
        Config = nextConfig;
    }
};
