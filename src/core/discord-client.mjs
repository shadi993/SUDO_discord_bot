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
        var promises = [];
        for (const module of ClientReadyModules) {
            promises.push(module.onDiscordReady());
        }
        Promise.all(promises);
    });

    DiscordClient.on(Events.MessageCreate, async (message) => {
        var promises = [];
        for (const module of MessageCreateModules) {
            promises.push(module.onDiscordMessage(message));
        }
        await Promise.all(promises);
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
