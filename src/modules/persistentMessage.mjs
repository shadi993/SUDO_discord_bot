import { CreateLogger } from '../core/logger.mjs';
import * as fs from 'node:fs';

export const PersistentMessage = class {
    #logger;
    #messages;
    #discordChannels;

    constructor() {
        this.#logger = CreateLogger('PersistentMessage');
        this.#messages = JSON.parse(fs.readFileSync('persistentMessages.json'));

        if (!Array.isArray(this.#messages)) {
            this.#logger.log('error', 'Messages must be an array.');
            throw new Error('Messages must be an array.');
        }
    }

    async #deleteAndRepostMessage(channel, messageContent) {
        try {
            const messages = await channel.messages.fetch({ limit: 20 });
    
            // Find the bot's message in the channel
            const botMessage = messages.find((msg) => msg.author.id === process.env.DISCORD_CLIENT_ID);
    
            if (botMessage) {
                this.#logger.log('info', `Deleting bot message in channel: ${channel.name}`);
                await botMessage.delete().catch((error) => {
                    this.#logger.log('warning', `Failed to delete bot message: ${error.message}`);
                });
            } else {
                this.#logger.log('info', `No bot message found in channel: ${channel.name}`);
            }
    
            // Repost the bot's message
            this.#logger.log('info', `Reposting message in channel: ${channel.name}`);
            await channel.send(messageContent);
        } catch (error) {
            this.#logger.log('error', `Failed to repost message in channel ${channel.name}: ${error.message}`);
        }
    }

    async onDiscordReady(guild, channels) {
        this.#logger.log('info', 'PersistentMessage module is ready.');

        this.#discordChannels = channels;

        for (const { channel_name, message } of this.#messages) {
            const channel = this.#discordChannels.find((ch) => ch.name === channel_name);

            if (channel) {
                await this.#deleteAndRepostMessage(channel, message);
            } else {
                this.#logger.log('error', `Channel not found: ${channel_name}`);
            }
        }
    }

    async onDiscordMessage(message) {
        if (message.author.bot) return; // Ignore bot messages

        // Check if the message is in one of the monitored channels
        const monitoredChannel = this.#messages.find(
            (entry) => entry.channel_name === message.channel.name
        );

        if (!monitoredChannel) return;

        this.#logger.log(
            'info',
            `Detected new message in monitored channel: ${message.channel.name}`
        );

        // Delete the bot's message and repost it
        await this.#deleteAndRepostMessage(message.channel, monitoredChannel.message);
    }
};
