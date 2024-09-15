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
    #guild;


    constructor() {
        this.#logger = CreateLogger('NotifyModule');
    }

    /*eslint no-unused-vars: ["error", {"args": "none"}]*/
    async onDiscordReady(guild, channels, roles) {
        this.#logger.log('info', 'NotifyModule module is ready.');
        this.#logger.log('info', 'NotifyModule registering additional callbacks.');
        this.#notifyChannel = channels.find(channel => channel.name === Config.notify.channel);
        this.#guild = guild;
        
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
            this.#logger.log('info', `${message.author.globalName} deleted: ${message.content}`);

            if (!message.member) return;
            if (message.member.user.bot) return;
            
            const deletedMessageEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: `${message.author.globalName}`,iconURL:message.author.displayAvatarURL() })
                .addFields({ name: '\u200B', value: `🗑 <@${message.author.id}> deleted a message in ${message.channel.toString()} ` }
                )
                
                .setTimestamp()
                .setFooter({ text: 'SUDO' })
                if (message.content) {
                    deletedMessageEmbed.addFields({ name: 'Message:', value: message.content });
                } else {
                    deletedMessageEmbed.addFields({ name: 'Message:', value: 'No text content' });
                }
            
                // Check for attachments (including GIFs)
                if (message.attachments.size > 0) {
                    const attachmentURLs = message.attachments.map(attachment => attachment.url).join('\n');
                    deletedMessageEmbed.addFields({ name: 'Attachments:', value: attachmentURLs });
                }

            await this.#notifyChannel.send({ embeds: [deletedMessageEmbed] });
        });

        DiscordClient.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
            this.#logger.log('info', `Message updated: ${oldMessage.content} -> ${newMessage.content}`);

            if (oldMessage.author.bot) return;

            const guildID = this.#guild.id.toString();
            const modifiedMessageEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: `${oldMessage.author.globalName}`,iconURL:oldMessage.author.displayAvatarURL() })
                .addFields({ name: '\u200B', value: `✍️ <@${oldMessage.author.id}> modified a message in ${oldMessage.channel.toString()} [jump to Message](https://discord.com/channels/${guildID}/${oldMessage.channelId.toString()}/${oldMessage.id.toString()})` },
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
                    }
                });
                guildMemberEmbed.addFields({name:"\u200B", value:`<@${oldMember.user.id}> updated Role`},{name:"Role Removed", value:"⛔️ "+ roleArray.toString()});
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
                    }
                });
                guildMemberEmbed.addFields({name:"\u200B", value:`<@${oldMember.user.id}> updated Role`},{name:"Role Added", value:"✅ "+ roleArray.toString()});
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

            // User joined a voice channel
            if (!oldState.channelId && newState.channelId) {
                this.#logger.log('info', `${oldState.member.user.displayName} joined the voice channel: ${newState.channel.name}`);
                const voiceStateEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setAuthor({ name: `${oldState.member.user.globalName}`, iconURL: oldState.member.user.displayAvatarURL() })
                    .setDescription(`<@${oldState.member.user.id}> joined the voice channel: **${newState.channel.name}**`)
                    .setTimestamp()
                    .setFooter({ text: 'SUDO' });
        
                await this.#notifyChannel.send({ embeds: [voiceStateEmbed]});
            }
        
            // User left a voice channel
            if (oldState.channelId && !newState.channelId) {
                this.#logger.log('info', `${oldState.member.user.displayName} left the voice channel: ${oldState.channel.name}`);
                const voiceStateEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setAuthor({ name: `${oldState.member.user.globalName}`, iconURL: oldState.member.user.displayAvatarURL() })
                    .setDescription(`<@${oldState.member.user.id}> left the voice channel: **${oldState.channel.name}**`)
                    .setTimestamp()
                    .setFooter({ text: 'SUDO' });
        
                await this.#notifyChannel.send({ embeds: [voiceStateEmbed]});
            }
        
            // User moved to another voice channel
            if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                this.#logger.log('info', `${oldState.member.user.displayName} moved from ${oldState.channel.name} to ${newState.channel.name}`);
                const voiceStateEmbed = new EmbedBuilder()
                    .setColor('#E67E22')
                    .setAuthor({ name: `${oldState.member.user.globalName}`, iconURL: oldState.member.user.displayAvatarURL() })
                    .setDescription(`<@${oldState.member.user.id}> moved from **${oldState.channel.name}** to **${newState.channel.name}**`)
                    .setFooter({ text: 'SUDO' });
        
                await this.#notifyChannel.send({ embeds: [voiceStateEmbed]});
            }
        });

        DiscordClient.on(Events.ThreadCreate, async (thread) => {
            const threadCreateEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('Thread Created')
            .setDescription(`A new thread named **${thread.name}** was created in **${thread.parent.name}**.`)
            .setTimestamp()
            .setFooter({ text: 'SUDO' });
            
    
        await this.#notifyChannel.send({ embeds: [threadCreateEmbed] });
        });

        DiscordClient.on(Events.ThreadDelete, async (thread) => {
            const threadDeleteEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('Thread Deleted')
            .setDescription(`The thread named **${thread.name}** in **${thread.parent.name}** was deleted.`)
            .setTimestamp()
            .setFooter({ text: 'SUDO' });
    
            await this.#notifyChannel.send({ embeds: [threadDeleteEmbed] });
        });

        DiscordClient.on(Events.ThreadUpdate, async (oldThread, newThread) => {
            const threadUpdateEmbed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('Thread Updated')
            .setDescription(`The thread **${oldThread.name}** was updated. New name: **${newThread.name}**.`)
            .setTimestamp()
            .setFooter({ text: 'SUDO' });
    
            await this.#notifyChannel.send({ embeds: [threadUpdateEmbed] });
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
