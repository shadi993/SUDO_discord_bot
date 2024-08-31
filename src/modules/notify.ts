import { CreateLogger } from '../core/logger.ts';
import { DiscordClient } from "../core/discord-client.ts";
import { Collection, Events, Guild, NonThreadGuildBasedChannel, Role } from 'discord.js';

/**
 * Module for handling event notifications.
 * Because we subscribe to so many events, we just register them in the module.
 * If any of them need to be handled by multiple modules, we can move those to the core discord-client code.
 */
export const NotifyModule = class {
    #logger;

    constructor() {
        this.#logger = CreateLogger('NotifyModule');
    }

    /*eslint no-unused-vars: ["error", {"args": "none"}]*/
    async onDiscordReady(
            guild: Guild,
            channels: Collection<string, NonThreadGuildBasedChannel | null>,
            roles: Collection<string, Role>) {
        this.#logger.log('info', 'NotifyModule module is ready.');
        this.#logger.log('info', 'NotifyModule registering additional callbacks.');

        DiscordClient.on(Events.GuildMemberAdd, async (member) => {
            this.#logger.log('info', `New member joined: ${member.user.tag}`);
        });

        DiscordClient.on(Events.GuildMemberRemove, async (member) => {
            this.#logger.log('info', `Member left: ${member.user.tag}`);
        });

        DiscordClient.on(Events.MessageDelete, async (message) => {
            this.#logger.log('info', `Message deleted: ${message.content}`);
        });

        DiscordClient.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
            this.#logger.log('info', `Message updated: ${oldMessage.content} -> ${newMessage.content}`);
        });

        DiscordClient.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            this.#logger.log('info', `Member updated: ${oldMember.user.tag} -> ${newMember.user.tag}`);
        });

        DiscordClient.on(Events.GuildBanAdd, async (member) => {
            this.#logger.log('info', `User banned: ${member.user.tag}`);
        });

        DiscordClient.on(Events.GuildBanRemove, async (member) => {
            this.#logger.log('info', `User unbanned: ${member.user.tag}`);
        });

        DiscordClient.on(Events.VoiceServerUpdate, async (oldState, newState) => {
            this.#logger.log('info', `Voice server updated: ${oldState} -> ${newState}`);
        });

        DiscordClient.on(Events.VoiceStateUpdate, async (oldState, newState) => {
            this.#logger.log('info', `Voice state updated: ${oldState} -> ${newState}`);
        });

        //DiscordClient.on(Events.Raw, async (packet) => {
        //    this.#logger.log('info', `Raw packet.`, packet);
        //    if (packet.t == 'GUILD_AUDIT_LOG_ENTRY_CREATE') {
        //        packet.d.changes.forEach(change => {
        //            this.#logger.log('info', `Audit log entry: ${change.key} -> ${change.new_value}`, change);
        //        });
        //    }
        //});
    }
};
