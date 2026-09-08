import * as fs from 'node:fs';

/**
 * The configuration object as loaded from the config.json file.
 */
export var Config;
const configUpdateListeners = new Set();

export const RegisterConfigUpdateListener = listener => {
    configUpdateListeners.add(listener);
    return () => configUpdateListeners.delete(listener);
};

const defaultConfig = {
    leveling: { enabled: false, min_time_between_messages_seconds: 60, announcement_channel_name: '', ignore_channels: [], roles: {} },
    disboard: { enabled: false, message: 'You can bump again!' },
    autorole: { enabled: false, assign_on_join: [] },
    notify: { enabled: false, channel: '' },
    rank: { enabled: false, channel_allowed: '' },
    autokick: { enabled: false, account_age_limit: 30, info_enabled: true, info_channel: '' },
    moderation: { enabled: false, channel_name: '' },
    ticketSystem: { enabled: false, category_name: '', moderator: '', archives_channel: '' },
    dob_check: { enabled: false, channel_name: '', moderation_channel: '', verified_role: '', title: '', description: '', button_text: '', button_emoji: '✅', button_style: 'Success' },
    ban_emoji: { enabled: false, log: true, log_channel: '', emojis: [] },
    honeypot: { enabled: false, channel_name: '', log_channel_name: '', title: '', description: '', button_text: '', punishment: 'kick' },
    persistentMessages: { enabled: false, messages: [] },
    roles: { enabled: false, panels: [] },
    thresholdMessages: { enabled: false, messages: [] }
};

/**
 * Load the configuration from the config.json file.
 */
export const InitConfig = () => {
    if (!fs.existsSync('config.json')) {
        Config = structuredClone(defaultConfig);
        fs.writeFileSync('config.json', `${JSON.stringify(Config, null, 4)}\n`);
        return;
    }

    Config = JSON.parse(fs.readFileSync('config.json'));

    if (!Config) {
        throw new Error('Config must be an object.');
    }

    let migrated = false;
    if (Config.general || Config.database) {
        delete Config.general;
        delete Config.database;
        migrated = true;
    }

    for (const value of Object.values(Config)) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !Object.hasOwn(value, 'enabled')) {
            value.enabled = true;
            migrated = true;
        }
    }

    if (migrated) {
        fs.writeFileSync('config.json', `${JSON.stringify(Config, null, 4)}\n`);
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

    if (!Config) {
        Config = nextConfig;
        return;
    }

    const syncValue = (current, next) => {
        if (Array.isArray(current) && Array.isArray(next)) {
            current.splice(0, current.length, ...next.map(value => structuredClone(value)));
            return current;
        }
        if (current && next && typeof current === 'object' && typeof next === 'object'
            && !Array.isArray(current) && !Array.isArray(next)) {
            for (const key of Object.keys(current)) {
                if (!Object.hasOwn(next, key)) delete current[key];
            }
            for (const [key, value] of Object.entries(next)) {
                current[key] = Object.hasOwn(current, key)
                    ? syncValue(current[key], value)
                    : structuredClone(value);
            }
            return current;
        }
        return structuredClone(next);
    };

    syncValue(Config, nextConfig);
    for (const listener of configUpdateListeners) {
        Promise.resolve(listener(Config)).catch(error => {
            console.error(`Failed to apply live configuration update: ${error.message}`);
        });
    }
};

export const MigrateChannelNames = (channels) => {
    const isChannelKey = key => key.toLowerCase().includes('channel') || key.toLowerCase().includes('category');
    const migrate = (value, key = '') => {
        if (Array.isArray(value)) return value.map(item => migrate(item, key));
        if (!value || typeof value !== 'object') {
            if (!isChannelKey(key) || typeof value !== 'string') return value;
            return channels.find(channel => channel.id === value || channel.name === value)?.id || value;
        }
        return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
            childKey,
            migrate(childValue, childKey)
        ]));
    };

    const migrated = migrate(Config);
    if (JSON.stringify(migrated) !== JSON.stringify(Config)) {
        for (const key of Object.keys(Config)) delete Config[key];
        Object.assign(Config, migrated);
        fs.writeFileSync('config.json', `${JSON.stringify(Config, null, 4)}\n`);
    }
};
