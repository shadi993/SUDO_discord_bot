require('dotenv').config();

const {Client, Message} = require('discord.js');
const client = new Client({intents: 3276799});

client.on('ready',()=>{
    console.log(`${client.user.username} has logged in.`);
});

client.on('message', (message) => { 
    console.log(`[${message.author.tag}]: ${message.content}`);
    if (message.content === 'hello'){
        message.reply('Hello');
    }
});

client.login(process.env.DISCORD_BOT_TOKEN); 