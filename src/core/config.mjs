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

const createNotificationEvents = () => Object.fromEntries(Object.entries({
    members: ['member_joined', 'member_left', 'member_kicked', 'member_banned', 'member_unbanned', 'member_updated'],
    messages: ['message_edited', 'message_deleted'],
    voice: ['voice_joined', 'voice_left', 'voice_moved'],
    channels: ['channel_created', 'channel_deleted', 'channel_updated'],
    threads: ['thread_created', 'thread_deleted', 'thread_updated']
}).map(([group, events]) => [
    group,
    Object.fromEntries(events.map(event => [event, { enabled: true, channel: '' }]))
]));
const createNotificationEventGroup = (defaults, fallbackChannel) => Object.fromEntries(
    Object.entries(defaults).map(([event, settings]) => [
        event,
        { ...structuredClone(settings), channel: fallbackChannel || '' }
    ])
);

const defaultConfig = {
    leveling: { enabled: false, min_time_between_messages_seconds: 60, announcement_channel_name: '', ignore_channels: [], roles: {}, rank_enabled: false, rank_top_channel_enabled: false, rank_top_channel: '' },
    disboard: { enabled: false, message: 'You can bump again!' },
    autorole: { enabled: false, assign_on_join: [] },
    notify: {
        enabled: false,
        channel: '',
        events: createNotificationEvents()
    },
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

    if (Config.honeypot && !Object.hasOwn(Config.honeypot, 'enable_honeypot_channel')) {
        Config.honeypot.enable_honeypot_channel = false;
        migrated = true;
    }

    if (!Config.notify || typeof Config.notify !== 'object' || Array.isArray(Config.notify)) {
        Config.notify = structuredClone(defaultConfig.notify);
        migrated = true;
    } else if (!Config.notify.events || typeof Config.notify.events !== 'object' || Array.isArray(Config.notify.events)) {
        Config.notify.events = Object.fromEntries(Object.entries(defaultConfig.notify.events).map(([group, defaults]) => [
            group,
            createNotificationEventGroup(defaults, Config.notify.channel)
        ]));
        migrated = true;
    } else {
        for (const [group, groupDefaults] of Object.entries(defaultConfig.notify.events)) {
            if (!Config.notify.events[group] || typeof Config.notify.events[group] !== 'object' || Array.isArray(Config.notify.events[group])) {
                Config.notify.events[group] = createNotificationEventGroup(groupDefaults, Config.notify.channel);
                migrated = true;
                continue;
            }
            for (const [event, eventDefaults] of Object.entries(groupDefaults)) {
                const configured = Config.notify.events[group][event];
                if (typeof configured === 'boolean') {
                    Config.notify.events[group][event] = {
                        enabled: configured,
                        channel: Config.notify.channel || ''
                    };
                    migrated = true;
                    continue;
                }
                if (!configured || typeof configured !== 'object' || Array.isArray(configured)) {
                    Config.notify.events[group][event] = {
                        ...structuredClone(eventDefaults),
                        channel: Config.notify.channel || ''
                    };
                    migrated = true;
                    continue;
                }
                if (typeof configured.enabled !== 'boolean') {
                    configured.enabled = eventDefaults.enabled;
                    migrated = true;
                }
                if (typeof configured.channel !== 'string') {
                    configured.channel = Config.notify.channel || '';
                    migrated = true;
                }
            }
        }
    }

    const hasLevelingConfig = Config.leveling && typeof Config.leveling === 'object' && !Array.isArray(Config.leveling);
    if (!hasLevelingConfig) {
        Config.leveling = structuredClone(defaultConfig.leveling);
        migrated = true;
    }

    const legacyRankEnabled = typeof Config.rank?.enabled === 'boolean'
        ? Config.rank.enabled
        : defaultConfig.leveling.rank_enabled;
    const legacyRankChannel = typeof Config.rank?.channel_allowed === 'string'
        ? Config.rank.channel_allowed
        : '';
    if (!hasLevelingConfig || typeof Config.leveling.rank_enabled !== 'boolean') {
        Config.leveling.rank_enabled = legacyRankEnabled;
        migrated = true;
    }
    if (!hasLevelingConfig || !Object.hasOwn(Config.leveling, 'rank_top_channel')) {
        Config.leveling.rank_top_channel = legacyRankChannel;
        migrated = true;
    }
    if (!hasLevelingConfig || typeof Config.leveling.rank_top_channel_enabled !== 'boolean') {
        Config.leveling.rank_top_channel_enabled = Boolean(legacyRankChannel);
        migrated = true;
    }
    if (Object.hasOwn(Config, 'rank')) {
        delete Config.rank;
        migrated = true;
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
