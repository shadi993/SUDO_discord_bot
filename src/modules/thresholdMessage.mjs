import { CreateLogger } from '../core/logger.mjs';
import { Config } from '../core/config.mjs';
import { findDiscordChannel } from '../core/discord-helpers.mjs';

const containsMediaOrLink = message => (
    message.attachments.size > 0
    || message.embeds.length > 0
    || /https?:\/\/\S+/i.test(message.content || '')
);

export const ThresholdMessage = class {
    #logger;
    #messageCounts;
    #config;
    #activeBotMessages;
    #activeChannels;

    constructor() {
        this.#logger = CreateLogger('ThresholdMessage');
        this.#messageCounts = {};
        this.#activeBotMessages = {};
        this.#activeChannels = new Set();
        this.#config = Config.thresholdMessages?.messages || [];

        if (!Array.isArray(this.#config)) {
            this.#logger.log('error', 'Config must be an array.');
            throw new Error('Config must be an array.');
        }
    }

    async #postBotMessage(channel, messageContent) {
        try {
            return await channel.send(messageContent);
        } catch (error) {
            this.#logger.log('error', `Failed to post bot message in ${channel.name}: ${error.message}`);
            return null;
        }
    }

    async #deleteBotMessage(channelId) {
        const botMessage = this.#activeBotMessages[channelId];
        if (!botMessage) return;

        try {
            await botMessage.delete();
        } catch (error) {
            if (error.code !== 10008) {
                this.#logger.log('warn', `Failed to delete threshold message in ${channelId}: ${error.message}`);
            }
        } finally {
            delete this.#activeBotMessages[channelId];
        }
    }

    async #keepReminderAtBottom(channel, messageContent) {
        await this.#deleteBotMessage(channel.id);
        const botMessage = await this.#postBotMessage(channel, messageContent);
        if (botMessage) this.#activeBotMessages[channel.id] = botMessage;
    }

    async onDiscordReady(_guild, channels) {
        if (!Config.thresholdMessages?.enabled) return;
        this.#logger.log('info', 'ThresholdMessage module is ready.');
        for (const entry of this.#config) {
            const channel = findDiscordChannel(channels, entry.channel_name);
            if (!channel) {
                this.#logger.log('warn', `Threshold channel not found: ${entry.channel_name}`);
                continue;
            }

            if (entry.enabled === false) {
                this.#logger.log('info', `Threshold monitoring disabled: ${channel.name}`);
                continue;
            }
            this.#messageCounts[channel.id] = 0;
            this.#logger.log('info', `Monitoring threshold messages in ${channel.name}`);
        }
    }

    async onConfigUpdate(_guild, channels) {
        this.#config = Config.thresholdMessages?.messages || [];
        this.#messageCounts = {};
        this.#activeChannels.clear();
        return this.onDiscordReady(_guild, channels);
    }

    async onDiscordMessage(message) {
        if (!Config.thresholdMessages?.enabled || !message.guild || message.author.bot) return;

        const monitoredChannel = this.#config.find(entry =>
            entry.enabled !== false
            && (entry.channel_name === message.channel.id || entry.channel_name === message.channel.name)
        );
        if (!monitoredChannel) return;

        const channelId = message.channel.id;
        if (containsMediaOrLink(message)) {
            this.#messageCounts[channelId] = 0;
            this.#activeChannels.delete(channelId);
            await this.#deleteBotMessage(channelId);
            this.#logger.log('info', `Media or link detected in ${message.channel.name}; threshold reset.`);
            return;
        }

        if (this.#activeChannels.has(channelId)) {
            await this.#keepReminderAtBottom(message.channel, monitoredChannel.bot_message);
            return;
        }

        this.#messageCounts[channelId] = (this.#messageCounts[channelId] || 0) + 1;
        const threshold = Number(monitoredChannel.threshold);
        if (!Number.isInteger(threshold) || threshold < 1) {
            this.#logger.log('warn', `Invalid threshold for ${message.channel.name}: ${monitoredChannel.threshold}`);
            return;
        }

        if (this.#messageCounts[channelId] >= threshold) {
            this.#messageCounts[channelId] = 0;
            this.#activeChannels.add(channelId);
            await this.#keepReminderAtBottom(message.channel, monitoredChannel.bot_message);
            this.#logger.log('info', `Threshold reached in ${message.channel.name}; reminder is active.`);
        }
    }
};
