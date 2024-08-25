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
        for (const module of ClientReadyModules) {
            module.onDiscordReady();
        }
    });

    DiscordClient.on(Events.MessageCreate, async (message) => {
        for (const module of MessageCreateModules) {
            module.onDiscordMessage(message);
        }
    });

    DiscordClient.login(process.env.DISCORD_BOT_TOKEN);
}

var ClientReadyModules = [];
var MessageCreateModules = [];

export const RegisterDiscordModule = (module) => {
    Logger.log('info', `Registering module: ${module.constructor.name}`);

    if (module.onDiscordReady) {
        ClientReadyModules.push(module);
    }

    if (module.onDiscordMessage) {
        MessageCreateModules.push(module);
    }
}
