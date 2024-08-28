import { CreateLogger } from '../core/logger.mjs';
import { DiscordClient } from "../core/discord-client.mjs";
import {Config} from "../core/config.mjs";

/**
 * Module for handling the disboard bumping system.
 * This module will send a reminder to bump the server every 2 hours.
 */
export const DisboardModule = class {
    constructor() {
        this.logger = CreateLogger('DisboardModule');
    }

    /*eslint no-unused-vars: ["error", {"args": "none"}]*/
    async onDiscordReady(guild, channels, roles) {
        this.logger.log('info', 'Disboard module is ready.');
    }

    async onDiscordMessage(message) {
        if(!Config.disboard.enabled)
            return;

        if (message.author.id.toString() === "302050872383242240" && message.embeds.length > 0 && message.embeds[0].description.includes("Bump done!")) {
            await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 60 * 1000));//2 hr sleep
            DiscordClient.channels.cache.get(message.channel.id).send(Config.disboard.message)
        }
    }
};
