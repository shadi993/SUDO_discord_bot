import * as fs from 'node:fs';

/**
 * The configuration object as loaded from the config.json file.
 */
export var Config;

const defaultConfig = {
    leveling: { enabled: true, min_time_between_messages_seconds: 60, announcement_channel_name: '', ignore_channels: [], roles: {} },
    disboard: { enabled: true, message: 'You can bump again!' },
    autorole: { enabled: true, assign_on_join: [] },
    notify: { enabled: true, channel: '' },
    rank: { enabled: true, channel_allowed: '' },
    autokick: { enabled: true, account_age_limit: 30, info_enabled: true, info_channel: '' },
    moderation: { enabled: true, channel_name: '' },
    ticketSystem: { enabled: true, category_name: '', moderator: '', archives_channel: '' },
    dob_check: { enabled: true, channel_name: '', moderation_channel: '', verified_role: '', title: '', description: '', button_text: '', button_emoji: '✅', button_style: 'Success' },
    ban_emoji: { enabled: true, log: true, log_channel: '', emojis: [] },
    honeypot: { enabled: true, channel_name: '', log_channel_name: '', title: '', description: '', button_text: '', punishment: 'kick' },
    persistentMessages: { enabled: true, messages: [] },
    roles: { enabled: true, panels: [] },
    thresholdMessages: { enabled: true, messages: [] }
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

    if (Config) {
        for (const key of Object.keys(Config)) delete Config[key];
        Object.assign(Config, nextConfig);
    } else {
        Config = nextConfig;
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
