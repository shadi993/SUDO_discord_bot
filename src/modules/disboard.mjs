// This is the leveling module. It is responsible for handling the leveling system.

import { CreateLogger } from '../core/logger.mjs';
import {DiscordClient} from "../core/discord-client.mjs";

export const DisboardModule = class {
    constructor() {
        this.logger = CreateLogger('DisboardModule');
    }

    onDiscordReady() {
        this.logger.log('info', 'Disboard module is ready.');
    }

    async onDiscordMessage(message) {
        if (message.author.id.toString() === "302050872383242240" && message.embeds.length > 0 && message.embeds[0].description.includes("Bump done!")){
                await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 60 * 1000));//2 hr sleep
                DiscordClient.channels.cache.get(message.channel.id).send("You can bump again!")
        }
    }
};
