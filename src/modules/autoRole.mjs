import { CreateLogger } from '../core/logger.mjs';
import { DiscordClient } from "../core/discord-client.mjs";
import { Events } from 'discord.js';
import { Config } from "../core/config.mjs";

export const AutoRole = class {
    #roles

    constructor() {
        this.logger = CreateLogger('AutoRole');
    }

    /*eslint no-unused-vars: ["error", {"args": "none"}]*/
    async onDiscordReady(guild, channels, roles) {
        if (Config.autorole.enabled !== true) {
            this.logger.log('info', 'AutoRole module is disabled.');
            return;
        }
        this.logger.log('info', 'AutoRole module is ready.');
        this.#roles = roles

        DiscordClient.on(Events.GuildMemberUpdate, async (member) => {
            this.logger.log('info', `Pending: ${member.pending}`);
            if (member.pending === true) {
                await this.onMemberAcceptedRules(member);
            }
        });
    }

    async onMemberAcceptedRules(member) {
        this.logger.log('info', `Member accepted rules: ${member.user.tag}`);

        for (const roleName of Config.autorole.assign_on_join) {
            await this.assignRoleByName(member, roleName);
        }
    }

    async assignRoleByName(member, roleName) {
        const role = this.#roles.find((discordRole) => discordRole.name === roleName);
        if (!role) {
            this.logger.log('error', `Expected join role does not exist in current guild.`);
            throw new Error('Role not found');
        }

        this.logger.log('info', `Adding role ${role.name} to ${member.user.tag}`);
        await member.roles.add(role);
    }
};