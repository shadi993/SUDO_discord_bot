import { config } from 'dotenv';
import { InitCommands } from './commands/init.mjs';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { InitLogger, Logger } from './core/logger.mjs';

config();
InitLogger();

const client = new Client({
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

InitCommands(client);

client.once(Events.ClientReady, () => {
    Logger.log('info', `${client.user.username} has logged in.`);
});

client.on(Events.MessageCreate, async (message) => {
    Logger.log('info', `[${message.author.tag}]: ${message.content}`);
    if (message.content === 'hello') {
        message.reply('Hello');
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
