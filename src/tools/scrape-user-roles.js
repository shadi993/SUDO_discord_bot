import { config } from 'dotenv';
import { InitConfig } from '../core/config.mjs';
import { InitLogger } from '../core/logger.mjs';
import { Logger } from './../core/logger.mjs';
import { Client, GatewayIntentBits } from 'discord.js';
import * as fs from 'node:fs';

config();
InitConfig();
InitLogger();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

let userLevels = {};

function updateUserLevel(message) {
    // Regex to match the user ID
    const userIdRegex = /<@(\d+)>/;
    // Regex to match the level wrapped in **
    const levelRegex = /\*\*(\d+)\*\*/g;

    // Extract user ID
    const userIdMatch = message.match(userIdRegex);
    const userId = userIdMatch ? userIdMatch[1] : null;

    if (!userId) {
        Logger.log('debug', `No user ID found in message: ${message}`);
        return;
    }

    // Extract all levels
    const levelMatches = Array.from(message.matchAll(levelRegex));
    const currentLevel = levelMatches.length > 1 ? levelMatches[1][1] : null;

    if (!currentLevel) {
        Logger.log('debug', `No level found in message: ${message}`);
        return;
    }

    userLevels[userId] = currentLevel;
    Logger.log('info', `Updated user ${userId} to level ${currentLevel}`);
}

client.once('ready', async () => {
    Logger.log('info',`Logged in as ${client.user.tag}`);
    const channel = client.channels.cache.get(process.env.DISCORD_SCRAPE_CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
        Logger.log('error', `Invalid channel or not a text channel!`);
        process.exit(1);
    }

    let messages = [];
    let lastMessageId;

    while (true) {
        const options = { limit: 100 };
        if (lastMessageId) {
            options.before = lastMessageId;
        }

        Logger.log('debug', `Fetching messages before ID: ${lastMessageId}`);
        const fetchedMessages = await channel.messages.fetch(options);
        Logger.log('debug', `Fetched ${fetchedMessages.size} messages`);

        if (fetchedMessages.size === 0) {
            Logger.log('info', `No more messages to fetch.`);
            break;
        }

        messages = messages.concat(Array.from(fetchedMessages.values()));
        lastMessageId = fetchedMessages.last().id;
    }

    Logger.log('info', `Processing ${messages.length} messages`);
    messages.reverse().map(msg => updateUserLevel(msg.content))

    Logger.log('info', `Writing user levels to file`);
    fs.writeFileSync('userid_levels.json', JSON.stringify(userLevels, null, 2));

    Logger.info('info', `Completed and shutting down client`);
    client.destroy();
});

client.login(process.env.DISCORD_BOT_TOKEN);

