import { Client, GatewayIntentBits, Events, Guild, Collection, NonThreadGuildBasedChannel, Role } from 'discord.js';
import { Logger } from './logger.ts';

export var DiscordClient: Client;

var DiscordGuild: Guild;
var DiscordChannels: Collection<string, NonThreadGuildBasedChannel | null>;
var DiscordRoles: Collection<string, Role>;

/**
 * Initialize the Discord client. This will log in the bot and set up the event handlers.
 */
export const InitDiscordClient = () => {
    DiscordClient = new Client({
        intents:
            GatewayIntentBits.Guilds |
            GatewayIntentBits.GuildModeration |
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
        // First load all the information we need from the guild
        // before reporting to all the modules. This way we only
        // need to fetch the guild, channels and roles once.

        Logger.log('info', 'Discord client is ready.');

        Logger.log('debug', 'Fetching guild...');
        const discordGuildId: string | undefined = process.env.DISCORD_GUILD_ID;

        if (!discordGuildId) {
            Logger.log('error', 'DISCORD_GUILD_ID is not set in the environment.');
            throw new Error('DISCORD_GUILD_ID is not set in the environment.');
        }

        DiscordClient.guilds.fetch(discordGuildId)
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

var ClientReadyModules: any[] = [];
var MessageCreateModules: any[] = [];
var InteractionModules: any[] = [];

/**
 * Register a module to receive Discord events.
 * @param {object} module - The module to register.
 */
export const RegisterDiscordModule = (module: any) => {
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
