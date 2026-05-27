import { CreateLogger } from '../core/logger.mjs';
import { DiscordClient } from "../core/discord-client.mjs";
import { Events } from 'discord.js';
import { Config } from "../core/config.mjs";

export const AutoRole = class {
    #roles;

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

        this.#roles = roles;


        if (!this.listenerAttached) {this.listenerAttached = true;

        DiscordClient.on(
            Events.GuildMemberUpdate,
            async (oldMember, newMember) => {
                try {
                    this.logger.log('info',`Pending: ${oldMember.pending} -> ${newMember.pending}`
                    );

                    if (oldMember.pending && !newMember.pending) {
                        await this.onMemberAcceptedRules(newMember);
                    }
                } catch (err) {
                    this.logger.log('error',`GuildMemberUpdate handler failed: ${err.message}`
                    );
                }
            }
        );}
    }

    async onMemberAcceptedRules(member) {
        try {
            this.logger.log('info',`Member accepted rules: ${member.user.tag}`);

            await Promise.all(
                Config.autorole.assign_on_join.map((roleName) =>
                    this.assignRoleByName(member, roleName)
                )
            );
        } catch (err) {
            this.logger.log('error',`Failed processing accepted rules: ${err.message}`);
        }
    }

    async assignRoleByName(member, roleName) {
        try {
            const role = this.#roles.find(
                (discordRole) => discordRole.name === roleName
            );

            if (!role) {
                this.logger.log('error',`Expected join role "${roleName}" does not exist in current guild.`);
                return;
            }

            const freshMember = await member.guild.members
                .fetch(member.id)
                .catch(() => null);

            if (!freshMember) {
                this.logger.log('warn',`Member ${member.user.tag} no longer exists.`);
                return;
            }

            this.logger.log('info',`Adding role ${role.name} to ${member.user.tag}`
            );

            await freshMember.roles.add(role);

            this.logger.log('info',`Successfully added role ${role.name} to ${member.user.tag}`);

        } catch (err) {
            if (err.code === 10007) {
                this.logger.log('warn',`Cannot add role "${roleName}" because member left or was kicked.`);
                return;
            }

            this.logger.log('error',`Failed to add role "${roleName}" to ${member.user.tag}: ${err.message}`);
        }
    }
};