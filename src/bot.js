require('dotenv').config();

const {Client, GatewayIntentBits, Events} = require('discord.js');
const client = new Client({ intents:
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

client.once(Events.ClientReady,() => {
    console.log(`${client.user.username} has logged in.`);
});

client.on(Events.MessageCreate, async (message) => {
    console.log(`[${message.author.tag}]: ${message.content}`);
    if (message.content === 'hello'){
        message.reply('Hello');
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
