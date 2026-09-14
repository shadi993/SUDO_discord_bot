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
    honeypot: { enabled: false, enable_honeypot_channel: false, channel_name: '', log_channel_name: '', title: '', description: '', button_text: '', punishment: 'kick' },
    persistentMessages: { enabled: false, messages: [] },
    roles: { enabled: false, panels: [] },
    thresholdMessages: { enabled: false, messages: [] }
};

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
