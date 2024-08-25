import { config } from 'dotenv';
import { InitCommands } from './commands/init.mjs';
import { Client, GatewayIntentBits, Events } from 'discord.js';

config();

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
    console.log(`${client.user.username} has logged in.`);
});

client.on(Events.MessageCreate, async (message) => {
    console.log(`[${message.author.tag}]: ${message.content}`);
    if (message.content === 'hello') {
        message.reply('Hello');
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
