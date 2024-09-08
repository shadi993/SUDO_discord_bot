import { CreateLogger } from '../core/logger.mjs';
import { DiscordClient } from "../core/discord-client.mjs";
import { Events, EmbedBuilder } from 'discord.js';
import { Config } from "../core/config.mjs";

/**
 * Module for handling event notifications.
 * Because we subscribe to so many events, we just register them in the module.
 * If any of them need to be handled by multiple modules, we can move those to the core discord-client code.
 */
export const NotifyModule = class {
    #logger;
    #notifyChannel;

    constructor() {
        this.#logger = CreateLogger('NotifyModule');
    }

    /*eslint no-unused-vars: ["error", {"args": "none"}]*/
    async onDiscordReady(guild, channels, roles) {
        this.#logger.log('info', 'NotifyModule module is ready.');
        this.#logger.log('info', 'NotifyModule registering additional callbacks.');
        this.#notifyChannel = channels.find(channel => channel.name === Config.notify.channel);

        DiscordClient.on(Events.GuildMemberAdd, async (member) => {
            this.#logger.log('info', `New member joined: ${member.user.tag}`);
            const newJoinEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setAuthor({ name: `${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
                .setThumbnail(member.user.displayAvatarURL())
                .addFields({ name: '\u200B', value: `<@${member.user.id}> **has joined the server**` },
                    { name: 'Display Name', value: `${member.user.displayName}`},
                    { name: 'Joined at', value: `<t:${(member.joinedTimestamp / 1000).toString().split('.')[0]}> (<t:${(member.joinedTimestamp / 1000).toString().split('.')[0]}:R>)` },
                    { name: 'Created at', value: `<t:${(member.user.createdTimestamp / 1000).toString().split('.')[0]}> (<t:${(member.user.createdTimestamp / 1000).toString().split('.')[0]}:R>)` })
                .setTimestamp()
                .setFooter({ text: 'SUDO' })

            await this.#notifyChannel.send({ embeds: [newJoinEmbed] });
        });

        DiscordClient.on(Events.GuildMemberRemove, async (member) => {
            this.#logger.log('info', `Member left: ${member.user.tag}`);

            const leftServerEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: `${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
                .setThumbnail(member.user.displayAvatarURL())
                .addFields({ name: '\u200B', value: `<@${member.user.id}> has left the server` },
                    { name: 'Created at', value: `<t:${(member.user.createdTimestamp / 1000).toString().split('.')[0]}> (<t:${(member.user.createdTimestamp / 1000).toString().split('.')[0]}:R>)`  }
                )
                .setTimestamp()
                .setFooter({ text: 'SUDO' })

            await this.#notifyChannel.send({ embeds: [leftServerEmbed] });
        });

        DiscordClient.on(Events.MessageDelete, async (message) => {
            this.#logger.log('info', `${message.author.globalName} deleted:` + "```" + `${message.content}` + "```");

            const deletedMessageEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: `${message.author.globalName}` })
                .addFields({ name: '\u200B', value: `<@${message.author.id}> deleted a message` },
                    { name: 'message: ', value: "```" + `${message.content}` + "```" }
                )
                .setTimestamp()
                .setFooter({ text: 'SUDO' })

            await this.#notifyChannel.send({ embeds: [deletedMessageEmbed] });
        });

        DiscordClient.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
            this.#logger.log('info', `Message updated: ${oldMessage.content} -> ${newMessage.content}`);
            if (oldMessage.author.bot) return;
            const modifiedMessageEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: `${oldMessage.author.globalName}` })
                .addFields({ name: '\u200B', value: `<@${oldMessage.author.id}> modified a message` },
                    { name: 'old: ', value: "```" + `${oldMessage.content}` + "```" },
                    { name: 'new: ', value: "```" + `${newMessage.content}` + "```" },
                )
                .setTimestamp()
                .setFooter({ text: 'SUDO' })

            await this.#notifyChannel.send({ embeds: [modifiedMessageEmbed] });

        });

        DiscordClient.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            this.#logger.log('info', `Member updated: ${oldMember.user.tag} -> ${newMember.user.tag}`);

            
            if (oldMember.roles.cache.size > newMember.roles.cache.size) {
                // Creating an embed message.
                const guildMemberEmbed = new EmbedBuilder()
                guildMemberEmbed.setColor("#ED4245");
                guildMemberEmbed.setAuthor({name:newMember.user.tag, iconURL:newMember.user.displayAvatarURL()});
                guildMemberEmbed.setThumbnail(oldMember.user.displayAvatarURL());
                let roleArray=[];
                oldMember.roles.cache.forEach(role => {
                    if (!newMember.roles.cache.has(role.id)) {
                        roleArray.push(role);
                        //guildMemberEmbed.addFields({name:"Role Removed",value: role});
                    }
                });
                guildMemberEmbed.addFields({name:"Role Removed", value: roleArray.toString()});
                guildMemberEmbed.setTimestamp();
                guildMemberEmbed.setFooter({ text: 'SUDO' });
                await this.#notifyChannel.send({ embeds: [guildMemberEmbed] });

            } else if (oldMember.roles.cache.size < newMember.roles.cache.size) {
                const guildMemberEmbed = new EmbedBuilder()
                guildMemberEmbed.setColor("#57F287");
                guildMemberEmbed.setAuthor({name:newMember.user.tag, iconURL:newMember.user.displayAvatarURL()});
                guildMemberEmbed.setThumbnail(oldMember.user.displayAvatarURL());
                let roleArray=[];
                newMember.roles.cache.forEach(role => {
                    if (!oldMember.roles.cache.has(role.id)) {
                        roleArray.push(role);
                        //guildMemberEmbed.addFields({name:"Role Added", value: role});
                    }
                });
                guildMemberEmbed.addFields({name:"Role Added", value: roleArray.toString()});
                guildMemberEmbed.setTimestamp();
                guildMemberEmbed.setFooter({ text: 'SUDO' });
                await this.#notifyChannel.send({ embeds: [guildMemberEmbed] });
            }
        });

        DiscordClient.on(Events.GuildBanAdd, async (guild, user) => {
            this.#logger.log('info', `User banned: ${user.tag}`);

            const bannedEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: `${user.globalName}`, iconURL: user.displayAvatarURL() })
                .setThumbnail(user.displayAvatarURL())
                .addFields({ name: `${user.globalName}`, value: `${user.globalName} got banned` })
                .setTimestamp()
                .setFooter({ text: 'SUDO' })

            await this.#notifyChannel.send({ embeds: [bannedEmbed] });
        });

        DiscordClient.on(Events.GuildBanRemove, async (guild, user) => {
            this.#logger.log('info', `User unbanned: ${user.tag}`);

            const unbannedEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: `${user.globalName}`, iconURL: user.displayAvatarURL() })
                .addFields({ name: `${user.globalName}`, value: `${user.globalName} got unbanned` })
                .setTimestamp()
                .setFooter({ text: 'SUDO' })

            await this.#notifyChannel.send({ embeds: [unbannedEmbed] });
        });

        DiscordClient.on(Events.VoiceServerUpdate, async (oldState, newState) => {
            this.#logger.log('info', `Voice server updated: ${oldState} -> ${newState}`);
        });

        DiscordClient.on(Events.VoiceStateUpdate, async (oldState, newState) => {
            this.#logger.log('info', `Voice state updated: ${oldState} -> ${newState}`);
        });

        /*DiscordClient.on(Events.Raw, async (packet) => {
            this.#logger.log('info', `Raw packet.`, packet);
            if (packet.t == 'GUILD_AUDIT_LOG_ENTRY_CREATE') {
                packet.d.changes.forEach(change => {
                    this.#logger.log('info', `Audit log entry: ${change.key} -> ${change.new_value}`, change);
                });
            }
        });*/
    }
};
