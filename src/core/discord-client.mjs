import { Client, GatewayIntentBits, Events ,Partials} from 'discord.js';
import { Logger } from './logger.mjs';

export var DiscordClient;

var DiscordGuild;
var DiscordChannels;
var DiscordRoles;

/**
 * Initialize the Discord client. This will log in the bot and set up the event handlers.
 */
export const InitDiscordClient = () => {
    DiscordClient = new Client({
        intents:[
            GatewayIntentBits.Guilds |
            GatewayIntentBits.GuildModeration |
            GatewayIntentBits.GuildMembers |
            GatewayIntentBits.GuildMessages |
            GatewayIntentBits.GuildMessageReactions |
            GatewayIntentBits.GuildMembers |
            GatewayIntentBits.GuildPresences |
            GatewayIntentBits.GuildEmojisAndStickers |
            GatewayIntentBits.GuildVoiceStates |
            GatewayIntentBits.DirectMessages |
            GatewayIntentBits.DirectMessageReactions |
            GatewayIntentBits.MessageContent
        ],
        partials: [
            Partials.Channel, // For DM channels
            Partials.Message, // For uncached messages
            Partials.Reaction, // For reaction events on uncached messages
            Partials.User, // For uncached users
            Partials.GuildMember, // For guild member events
            ],

    });

    DiscordClient.once(Events.ClientReady, () => {
        // First load all the information we need from the guild
        // before reporting to all the modules. This way we only
        // need to fetch the guild, channels and roles once.

        Logger.log('info', 'Discord client is ready.');

        Logger.log('debug', 'Fetching guild...');
        DiscordClient.guilds.fetch(process.env.DISCORD_GUILD_ID)
            .then((guild) => {
                Logger.log('debug', `Guild loaded: ${guild.name}`);
                DiscordGuild = guild;

                Logger.log('debug', 'Fetching channels...');
                guild.channels.fetch()
                    .then((channels) => {
                        Logger.log('debug', `Loaded ${channels.size} channels.`);
                        DiscordChannels = channels;

                        Logger.log('debug', 'Fetching roles...');
                        guild.roles.fetch()
                            .then((roles) => {
                                Logger.log('debug', `Loaded ${roles.size} roles.`);
                                DiscordRoles = roles;

                                var promises = [];
                                for (const module of ClientReadyModules) {
                                    promises.push(module.onDiscordReady(DiscordGuild, DiscordChannels, DiscordRoles));
                                }
                                Promise.all(promises);
                            })
                            .catch((error) => {
                                Logger.log('error', `Failed to fetch roles: ${error}`);
                                throw new Error(`Failed to fetch roles: ${error}`);
                            });
                    })
                    .catch((error) => {
                        Logger.log('error', `Failed to fetch channels: ${error}`);
                        throw new Error(`Failed to fetch channels: ${error}`);
                    });
            })
            .catch((error) => {
                Logger.log('error', `Failed to fetch guild: ${error}`);
                throw new Error(`Failed to fetch guild: ${error}`);
            });
    });

    DiscordClient.on(Events.MessageCreate, async (message) => {
        // Avoid events from messages that the bot has sent.
        if (message.author.id === process.env.DISCORD_CLIENT_ID) return;

        // Debug logs to check if event is getting triggers
        console.log(`Received message: "${message.content}" from ${message.author.tag} in ${message.channel.type}`);

        if (message.channel.type === 1) { 
            for (const module of MessageCreateModules) {
                if (module.onDiscordMessage) {
                    await module.onDiscordMessage(message);
                }
            }
        }

        var promises = [];
        for (const module of MessageCreateModules) {
            promises.push(module.onDiscordMessage(message));
        }
        await Promise.all(promises);
    });

    DiscordClient.on(Events.InteractionCreate, async (interaction) => {
        var promises = [];
        for (const module of InteractionModules) {
            promises.push(module.onDiscordInteraction(interaction));
        }
        await Promise.all(promises);
    });

    DiscordClient.login(process.env.DISCORD_BOT_TOKEN);
}

var ClientReadyModules = [];
var MessageCreateModules = [];
var InteractionModules = [];

/**
 * Register a module to receive Discord events.
 * @param {object} module - The module to register.
 */
export const RegisterDiscordModule = (module) => {
    Logger.log('info', `Registering module: ${module.constructor.name}`);

    if (module.onDiscordReady) {
        ClientReadyModules.push(module);
    }

    if (module.onDiscordMessage) {
        MessageCreateModules.push(module);
    }

    if (module.onDiscordInteraction) {
        InteractionModules.push(module);
    }
}
