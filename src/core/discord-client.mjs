import { Client, GatewayIntentBits, Events } from 'discord.js';
import { Logger } from './logger.mjs';

export var DiscordClient;

export const InitDiscordClient = () => {
    DiscordClient = new Client({
        intents:
            GatewayIntentBits.Guilds |
            GatewayIntentBits.GuildMembers |
            GatewayIntentBits.GuildMessages |
            GatewayIntentBits.GuildMessageReactions |
            GatewayIntentBits.GuildMembers |
            GatewayIntentBits.GuildEmojisAndStickers |
            GatewayIntentBits.DirectMessages |
            GatewayIntentBits.DirectMessageReactions |
            GatewayIntentBits.MessageContent
    });

    DiscordClient.once(Events.ClientReady, () => {
        Logger.log('info', `${DiscordClient.user.username} has logged in.`);
    });

    DiscordClient.on(Events.MessageCreate, async (message) => {
        Logger.log('info', `[${message.author.tag}]: ${message.content}`);
        if (message.content === 'hello') {
            message.reply('Hello');
        }
    });

    DiscordClient.login(process.env.DISCORD_BOT_TOKEN);
}
