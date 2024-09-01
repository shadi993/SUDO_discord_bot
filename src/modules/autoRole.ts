import { CreateLogger } from '../core/logger.ts';
import { DiscordClient } from "../core/discord-client.ts";
import { Config } from "../core/config.ts";
import { Collection, Events, Guild, GuildMember, NonThreadGuildBasedChannel, Role } from 'discord.js';
import { Logger } from 'log4js';

export const AutoRole = class {
    #roles?: Collection<string, Role>;
    #logger: Logger;

    constructor() {
        this.#logger = CreateLogger('AutoRole');
    }

    /*eslint no-unused-vars: ["error", {"args": "none"}]*/
    async onDiscordReady(
        guild: Guild,
        channels: Collection<string, NonThreadGuildBasedChannel | null>,
        roles: Collection<string, Role>) {
        if (Config.autorole.enabled !== true) {
            this.#logger.log('info', 'AutoRole module is disabled.');
            return;
        }

        this.#logger.log('info', 'AutoRole module is ready.');
        this.#roles = roles

        DiscordClient.on(Events.GuildMemberUpdate, async (member) => {
            this.#logger.log('info', `Pending: ${member.pending}`);
            if (member.pending === true) {
                await this.onMemberAcceptedRules(member);
            }
        });
    }

    async onMemberAcceptedRules(member: GuildMember) {
        this.#logger.log('info', `Member accepted rules: ${member.user.tag}`);

        for (const roleName of Config.autorole.assign_on_join) {
            await this.assignRoleByName(member, roleName);
        }
    }

    async assignRoleByName(member: GuildMember, roleName: string) {
        const role = this.#roles!.find((discordRole) => discordRole.name === roleName);
        if (!role) {
            this.#logger.log('error', `Expected join role does not exist in current guild.`);
            throw new Error('Role not found');
        }

        this.#logger.log('info', `Adding role ${role.name} to ${member.user.tag}`);
        await member.roles.add(role);
    }
};