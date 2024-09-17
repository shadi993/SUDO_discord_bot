import { CreateLogger } from '../core/logger.mjs';
import { DiscordClient } from "../core/discord-client.mjs";
import { Events, EmbedBuilder, AuditLogEvent, PermissionsBitField } from 'discord.js';
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

            
            const embed = new EmbedBuilder()
            .setAuthor({ name: `${newMember.user.tag}`, iconURL: newMember.user.displayAvatarURL() })
            .setColor('#E67E22')
            .setTitle('Member Updated')
            .setTimestamp();
    
            // Check for nickname change
            if (oldMember.nickname !== newMember.nickname) {
                embed.addFields({name: '\u200B',value: `<@${oldMember.user.id}>`},{
                    name: 'Nickname Changed',
                    value: `Old: ${oldMember.nickname || 'None'}\nNew: ${newMember.nickname || 'None'}`,
                }),
                embed.setThumbnail(oldMember.user.displayAvatarURL()),
                embed.setTimestamp(),
                embed.setFooter({ text: 'SUDO' });
            }
    
            // Check for role changes
            const oldRoles = oldMember.roles.cache.map(role => role.name);
            const newRoles = newMember.roles.cache.map(role => role.name);
    
            if (oldRoles.length !== newRoles.length) {
                const removedRoles = oldRoles.filter(role => !newRoles.includes(role));
                const addedRoles = newRoles.filter(role => !oldRoles.includes(role));
    
                if (addedRoles.length > 0) {
                    embed.addFields({name: '\u200B',value: `<@${oldMember.user.id}>`},{ name: 'Roles Added', value:"✅ "+ addedRoles.join(', ') }),
                    embed.setThumbnail(oldMember.user.displayAvatarURL()),
                    embed.setTimestamp(),
                    embed.setFooter({ text: 'SUDO' });
                }
                if (removedRoles.length > 0) {
                    embed.addFields({name: '\u200B',value: `<@${oldMember.user.id}>`},{ name: 'Roles Removed', value:"⛔️ "+ removedRoles.join(', ') })
                    embed.setThumbnail(oldMember.user.displayAvatarURL()),
                    embed.setTimestamp(),
                    embed.setFooter({ text: 'SUDO' });
                }
            }
    
            // Check for avatar change
            if (oldMember.user.displayAvatarURL() !== newMember.user.displayAvatarURL()) {
                embed.addFields({
                    name: 'Avatar Updated',
                    value: `<@${oldMember.user.id}> updated their profile picture.`,
                })
                .setThumbnail(newMember.user.displayAvatarURL()),
                embed.setTimestamp(),
                embed.setFooter({ text: 'SUDO' }); 
            }
    
            if (embed.data.fields.length > 0) {
                await this.#notifyChannel.send({ embeds: [embed] });
            }
        });

        DiscordClient.on(Events.GuildBanAdd, async (guild, user) => {
            this.#logger.log('info', `User banned: ${user.tag}`);

            const fetchedLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MemberBanAdd,
            });

            const banLog = fetchedLogs.entries.first();
            let executor = 'Unknown';

            if (banLog) {
                const { executor: banExecutor } = banLog; // Get the user who banned the member
                executor = banExecutor ? `${banExecutor.tag}` : 'Unknown';
            }

            const bannedEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: `${user.globalName}`, iconURL: user.displayAvatarURL() })
                .setThumbnail(user.displayAvatarURL())
                .addFields({ name: 'Banned User', value: `${user.globalName} (<@${user.id}>)`, inline: true },
                    { name: 'Banned By', value: executor, inline: true })
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
                    .setTimestamp()
                    .setFooter({ text: 'SUDO' });
        
                await this.#notifyChannel.send({ embeds: [voiceStateEmbed]});
            }
        });

        DiscordClient.on(Events.ThreadCreate, async (thread) => {

            const creator = await thread.fetchOwner()
            const threadCreateEmbed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('Thread Created')
            .setDescription(`[**${thread.name}**](https://discord.com/channels/${thread.guild.id}/${thread.parent.id}/${thread.id}) was created in **${thread.parent.name}**.`)
            .addFields({ name: 'Created by', value: `${creator.user.tag} <@${creator.id}>` })
            .setTimestamp()
            .setFooter({ text: 'SUDO' });
            
    
        await this.#notifyChannel.send({ embeds: [threadCreateEmbed] });
        });

        DiscordClient.on(Events.ThreadDelete, async (thread) => {

            const fetchedLogs = await thread.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ThreadDelete
            });
            const deletionLog = fetchedLogs.entries.first();
            let deleter = 'Unknown';

            if (deletionLog) {
                const { executor } = deletionLog;
                deleter = `${executor.tag} <@${executor.id}>`;
            }
            const threadDeleteEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('Thread Deleted')
            .setDescription(`The thread named **${thread.name}** in **${thread.parent.name}** was deleted.`)
            .addFields({ name: 'Deleted by', value: deleter })
            .setTimestamp()
            .setFooter({ text: 'SUDO' });
    
            await this.#notifyChannel.send({ embeds: [threadDeleteEmbed] });
        });

        DiscordClient.on(Events.ThreadUpdate, async (oldThread, newThread) => {

            const fetchedLogs = await newThread.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ThreadUpdate
            });
            const updateLog = fetchedLogs.entries.first();
            let updater = 'Unknown';

            if (updateLog) {
                const { executor } = updateLog;
                updater = `${executor.tag} <@${executor.id}>`;
            }
            const threadUpdateEmbed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('Thread Updated')
            .setDescription(`The thread [**${newThread.name}**](https://discord.com/channels/${newThread.guild.id}/${newThread.parent.id}/${newThread.id}) was updated. New name: **${newThread.name}**.`)
            .addFields({ name: 'Updated by', value: updater })
            .setTimestamp()
            .setFooter({ text: 'SUDO' });
    
            await this.#notifyChannel.send({ embeds: [threadUpdateEmbed] });
        });

        DiscordClient.on(Events.ChannelCreate, async (channel) => {
            const fetchedLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ChannelCreate,
            });
        
            const creationLog = fetchedLogs.entries.first();
            let creator = 'Unknown';
        
            if (creationLog) {
                const { executor } = creationLog;
                creator = `${executor.tag} <@${executor.id}>`;
            }
        
            const embed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('Channel Created')
                .addFields(
                    { name: 'Channel', value: `${channel.name} (${channel.type})` },
                    { name: 'Created by', value: creator }
                )
                .setTimestamp()
                .setFooter({ text: 'SUDO' });
        
            await this.#notifyChannel.send({ embeds: [embed] });
        });

        DiscordClient.on(Events.ChannelDelete, async (channel) => {
            const fetchedLogs = await channel.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ChannelDelete,
            });
        
            const deletionLog = fetchedLogs.entries.first();
            let deleter = 'Unknown';
        
            if (deletionLog) {
                const { executor } = deletionLog;
                deleter = `${executor.tag} <@${executor.id}>`;
            }
        
            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('Channel Deleted')
                .addFields(
                    { name: 'Channel', value: `${channel.name} (${channel.type})` },
                    { name: 'Deleted by', value: deleter }
                )
                .setTimestamp()
                .setFooter({ text: 'SUDO' });
        
                await this.#notifyChannel.send({ embeds: [embed] });
        });

        DiscordClient.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
            const fetchedLogs = await newChannel.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ChannelUpdate,
            });
        
            const updateLog = fetchedLogs.entries.first();
            let updater = 'Unknown';
        
            if (updateLog) {
                const { executor } = updateLog;
                updater = `${executor.tag} <@${executor.id}>`;
            }
        
            const embed = new EmbedBuilder()
                .setColor('#E67E22')
                .setTitle('Channel Updated')
                .setTimestamp()
                .setFooter({ text: 'SUDO' });
        
            // Check for name change
            if (oldChannel.name !== newChannel.name) {
                embed.addFields({
                    name: 'Name Changed',
                    value: `Old: ${oldChannel.name}\nNew: ${newChannel.name}`,
                });
            }
        
            // Check for topic change
            if (oldChannel.topic !== newChannel.topic) {
                embed.addFields({
                    name: 'Topic Changed',
                    value: `Old: ${oldChannel.topic || 'None'}\nNew: ${newChannel.topic || 'None'}`,
                });
            }
                // Permission changes
            const oldPerms = oldChannel.permissionOverwrites.cache;
            const newPerms = newChannel.permissionOverwrites.cache;
            const changes = [];

            newPerms.forEach((newPerm, id) => {
                const oldPerm = oldPerms.get(id);
        
                if (!oldPerm) {
                    // New permission overwrite added
                    changes.push(`**Added** permissions for ${getOverwriteTarget(newPerm)}: ${formatPermissions(newPerm.allow)}`);
                } else {
                    // Compare allow and deny bitfields
                    const addedPerms = newPerm.allow.bitfield & ~oldPerm.allow.bitfield;
                    const removedPerms = oldPerm.allow.bitfield & ~newPerm.allow.bitfield;
        
                    if (addedPerms) {
                        changes.push(`**Added** permissions for ${getOverwriteTarget(newPerm)}: ${formatPermissions(addedPerms)}`);
                    }
        
                    if (removedPerms) {
                        changes.push(`**Removed** permissions for ${getOverwriteTarget(newPerm)}: ${formatPermissions(removedPerms)}`);
                    }
                }
            });
        
            // Check for removed permission overwrites
            oldPerms.forEach((oldPerm, id) => {
                if (!newPerms.has(id)) {
                    // Permission overwrite removed
                    changes.push(`**Removed** permissions for ${getOverwriteTarget(oldPerm)}: ${formatPermissions(oldPerm.allow)}`);
                }
            });

            if (changes.length > 0) {
                embed.addFields({ name: 'Permissions Changed', value: changes.join('\n') });
            }
        
            embed.addFields({ name: 'Updated by', value: updater });
        
            // Send the embed if there are any updates
            if (embed.data.fields.length > 0) {
                await this.#notifyChannel.send({ embeds: [embed] });
            }
        });

        // Utility function to get the target of the permission overwrite (role or member)
        function getOverwriteTarget(overwrite) {
            return overwrite.type === 'role'
                ? `<@&${overwrite.id}>` // Role
                : `<@${overwrite.id}>`; // Member
        }

        // Utility function to format permission bits into readable permission names
        function formatPermissions(permissionBitfield) {
            const permissions = Object.keys(PermissionsBitField.Flags);
            const grantedPermissions = permissions.filter(perm => permissionBitfield & PermissionsBitField.Flags[perm]);
            return grantedPermissions.map(perm => `\`${perm}\``).join(', ');
        }
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
