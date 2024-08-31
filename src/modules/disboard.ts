import { CreateLogger } from '../core/logger.ts';
import { DiscordClient } from "../core/discord-client.ts";
import { Config } from "../core/config.ts";
import { Logger } from 'log4js';
import { Channel, Collection, Guild, Message, NonThreadGuildBasedChannel, Role, TextChannel } from 'discord.js';

/**
 * Module for handling the disboard bumping system.
 * This module will send a reminder to bump the server every 2 hours.
 */
export const DisboardModule = class {
    logger: Logger;

    constructor() {
        this.logger = CreateLogger('DisboardModule');
    }

    /*eslint no-unused-vars: ["error", {"args": "none"}]*/
    async onDiscordReady(
        guild: Guild,
        channels: Collection<string, NonThreadGuildBasedChannel | null>,
        roles: Collection<string, Role>) {
        this.logger.log('info', 'Disboard module is ready.');
    }

    async onDiscordMessage(message: Message<boolean>) {
        if (!Config.disboard.enabled)
            return;

        if (message.author.id.toString() === "302050872383242240" &&
            message.embeds.length > 0 &&
            message.embeds[0].description &&
            message.embeds[0].description.includes("Bump done!")) {
            await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 60 * 1000));//2 hr sleep
            const channel: Channel | undefined = DiscordClient.channels.cache.get(message.channel.id);

            if (!channel || !(channel instanceof TextChannel)) {
                return;
            }

            channel!.send(Config.disboard.message)
        }
    }
};
