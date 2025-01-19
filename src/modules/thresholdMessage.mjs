//this Module is made for channles where media is allowed but keeping the chat to minimum
// after certain amount of messages, the bot will send a post as reminder to members to keep the chat to minimum
// the bot will keep posting the same message or work similar to persistentMessage module until someone post a media and the count will rest
import { CreateLogger } from '../core/logger.mjs';
import * as fs from 'node:fs';

export const ThresholdMessage = class {
    #logger;
    #messageCounts;
    #config;
    #discordChannels;
    #activeBotMessages;
    #activeCollectors;

    constructor() {
        this.#logger = CreateLogger('ThresholdMessage');
        this.#messageCounts = {};
        this.#activeBotMessages = {};
        this.#activeCollectors = {};
        this.#config = JSON.parse(fs.readFileSync('thresholdMessages.json'));

        if (!Array.isArray(this.#config)) {
            this.#logger.log('error', 'Config must be an array.');
            throw new Error('Config must be an array.');
        }
    }

    async #postBotMessage(channel, messageContent) {
        try {
            this.#logger.log('info', `Posting bot message in channel: ${channel.name}`);
            const botMessage = await channel.send(messageContent);
            return botMessage;
        } catch (error) {
            this.#logger.log('error', `Failed to post bot message: ${error.message}`);
            return null;
        }
    }

    async #deleteBotMessage(channelId) {
        if (this.#activeBotMessages[channelId]) {
            try {
                await this.#activeBotMessages[channelId].delete();
                delete this.#activeBotMessages[channelId];
                this.#logger.log('info', `Deleted bot message in channel: ${channelId}`);
            } catch (error) {
                if (error.code === 10008) {
                    this.#logger.log('warning', `Message already deleted in channel: ${channelId}`);
                } else {
                    throw error;
                }
            }
        }
    }

    async #deleteAndRepostMessage(channel, messageContent) {
        const channelId = channel.id;
        await this.#deleteBotMessage(channelId);
        const botMessage = await this.#postBotMessage(channel, messageContent);
        if (botMessage) {
            this.#activeBotMessages[channelId] = botMessage;
        }
    }

    async onDiscordReady(guild, channels) {
        this.#logger.log('info', 'ThresholdMessage module is ready.');
        this.#discordChannels = channels;

        // Initialize message count for each monitored channel
        for (const { channel_name, enabled } of this.#config) {
            const channel = this.#discordChannels.find((ch) => ch.name === channel_name);

            if (channel) {
                if (enabled) {
                    this.#messageCounts[channel.id] = 0;
                    this.#logger.log('info', `Monitoring channel: ${channel.name}`);
                } else {
                    this.#logger.log('info', `Channel monitoring disabled: ${channel_name}`);
                }
            } else {
                this.#logger.log('error', `Channel not found: ${channel_name}`);
            }
        }
    }

    async onDiscordMessage(message) {
        if (message.author.bot) return;

        const monitoredChannel = this.#config.find(
            (entry) => entry.channel_name === message.channel.name
        );

        if (!monitoredChannel || !monitoredChannel.enabled) return;

        const { channel_name, threshold, bot_message } = monitoredChannel;
        const channelId = message.channel.id;

        // Check if the message contains media
        const hasMedia = message.attachments.size > 0 || message.embeds.length > 0;
        if (hasMedia) {
            this.#logger.log('info', `Media detected in channel: ${message.channel.name}`);

            // Reset the message count, delete the bot message, and stop the collector
            this.#messageCounts[channelId] = 0;
            await this.#deleteBotMessage(channelId);

            if (this.#activeCollectors[channelId]) {
                this.#activeCollectors[channelId].stop();
                delete this.#activeCollectors[channelId];
            }
            return;
        }

        // Increment the message count for the channel
        this.#messageCounts[channelId] = (this.#messageCounts[channelId] || 0) + 1;
        this.#logger.log(
            'debug',
            `Message count for channel ${channel_name}: ${this.#messageCounts[channelId]}`
        );

        // Check if message limits is reached
        if (this.#messageCounts[channelId] >= threshold) {
            this.#logger.log('info', `Threshold reached in channel: ${message.channel.name}`);

            await this.#deleteAndRepostMessage(message.channel, bot_message);
            this.#messageCounts[channelId] = 0;

            // Prevent multiple collectors for the same channel
            if (this.#activeCollectors[channelId]) {
                this.#logger.log('info', `Collector already active for channel: ${channel_name}`);
                return;
            }

            // Set up a collector for media messages
            const filter = (msg) => !msg.author.bot;
            const collector = message.channel.createMessageCollector({ filter, time: 3600000 }); // 1 hour

            this.#activeCollectors[channelId] = collector;

            collector.on('collect', async (newMessage) => {
                try {
                    const newHasMedia =
                        newMessage.attachments.size > 0 || newMessage.embeds.length > 0;

                    if (newHasMedia) {
                        this.#logger.log(
                            'info',
                            `Media detected. Deleting bot message in ${newMessage.channel.name}.`
                        );

                        await this.#deleteBotMessage(channelId);
                        collector.stop();
                        delete this.#activeCollectors[channelId];
                    }
                } catch (error) {
                    this.#logger.log('error', `Error while handling collected message: ${error.message}`);
                }
            });

            collector.on('end', () => {
                this.#logger.log('info', `Message collector stopped for channel ${channel_name}`);
                delete this.#activeCollectors[channelId];
            });
        }
    }
};
