import { CreateLogger } from '../core/logger.mjs';

/**
 * Module for handling the leveling system.
 * Users on the server will gain experience points for chatting.
 */
export const LevelingModule = class {
    constructor() {
        this.logger = CreateLogger('LevelingModule');
    }

    /*eslint no-unused-vars: ["error", {"args": "none"}]*/
    async onDiscordReady(guild, channels, roles) {
        this.logger.log('info', 'Leveling module is ready.');
    }

    //async onDiscordMessage(message) {
    //    this.logger.log('info', `[${message.author.tag}]: ${message.content}`);
    //
    //    if (message.content === 'hello') {
    //        message.reply('Hello');
    //    }
    //}
};
