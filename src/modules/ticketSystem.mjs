import { CreateLogger } from '../core/logger.mjs';
import { DiscordClient } from "../core/discord-client.mjs";
import { Events, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { Config } from "../core/config.mjs";

export const TicketSystem = class {
    #logger;
    #guild;
    #discordChannels;
    #tickets;
    #messageMap;

    constructor() {
        this.#logger = CreateLogger('TicketSystem');
        this.#tickets = {}; 
        this.#messageMap = new Map();
    }

    async #createTicketChannel(user) {
        const channelName = `ticket-${user.username}`.toLowerCase().replace(/\s+/g, '-');
        const categoryChannel = this.#discordChannels.find(
            (ch) => ch.name === Config.ticketSystem.category_name && ch.type === ChannelType.GuildCategory
        );

        if (!categoryChannel) {
            this.#logger.log('error', `Category "${Config.ticketSystem.category_name}" not found.`);
            throw new Error('Category not found.');
        }

        const parent = categoryChannel.id;

        const moderatorRole = this.#guild.roles.cache.find((role) => role.name === Config.ticketSystem.moderator);
        if (!moderatorRole) {
            this.#logger.log('error', `Moderator role with name "${Config.ticketSystem.moderator}" not found.`);
            throw new Error('Invalid moderator role name.');
        }

        const channel = await this.#guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent,
            topic: `Ticket for ${user.tag}`,
            permissionOverwrites: [
                {
                    id: this.#guild.roles.everyone.id,
                    deny: ['ViewChannel'],
                },
                {
                    id: user.id,
                    allow: ['ViewChannel', 'SendMessages', 'AttachFiles'],
                },
                {
                    id: moderatorRole.id,
                    allow: ['ViewChannel', 'SendMessages', 'ManageMessages'],
                },
            ],
        });

        this.#logger.log('info', `Created ticket channel: ${channel.name} for ${user.tag}`);

        // Send the initial embed message
        const embed = new EmbedBuilder()
            .setTitle(`Ticket for ${user.tag}`)
            .setDescription(
                `A user messaged the Bot.\n\n**User ID:** ${user.id}\n**Username:** ${user.username}`
            )
            .setColor(0x00ff00)
            .setTimestamp();

        const archiveButton = new ButtonBuilder()
            .setCustomId(`archive-ticket-${channel.id}`)
            .setLabel('Archive and Delete')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(archiveButton);

        await channel.send({ embeds: [embed], components: [row] });

        await user.send(
            `**Hello** ${user.username}**, a ticket has been opened for your message. A staff member will be with you shortly.**`);

        this.#tickets[user.id] = channel.id;

        return channel;
    }

    async #archiveAndDeleteTicket(channelId) {
        const channel = await this.#guild.channels.fetch(channelId, { force: true });
        if (!channel) {
            this.#logger.log('error', `Failed to fetch channel: ${channelId}`);
            return;
        }

        const userId = Object.keys(this.#tickets).find((key) => this.#tickets[key] === channelId);
        if (!userId) {
            this.#logger.log('error', `User ID not found for channel: ${channelId}`);
            return;
        }

        const user = await this.#guild.members.fetch(userId);

        const messages = await channel.messages.fetch({ limit: 100 });
        const archiveChannel = this.#discordChannels.find((ch) => ch.name === Config.ticketSystem.archives_channel);
        if (!archiveChannel) {
            this.#logger.log('error', `Archive channel "${Config.ticketSystem.archives_channel}" not found.`);
            return;
        }

        const transcriptHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Transcript: ${channel.name}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
                .message { margin-bottom: 10px; }
                .author { font-weight: bold; }
                .timestamp { font-size: 0.9em; color: gray; }
                .attachment { margin-top: 5px; }
            </style>
        </head>
        <body>
            <h1>Transcript for Ticket: ${channel.name}</h1>
            <p><strong>Users involved:</strong></p>
            <ul>
                ${Array.from(new Map(messages.map(msg => [msg.author.id, msg.author])).values())
                    .map(user => `<li>${user.tag} (${user.id})</li>`)
                    .join('')}
            </ul>
            <hr>
            <div>
                ${messages
                    .map(
                        (msg) => `
                    <div class="message">
                        <span class="author">${msg.author.tag}</span>
                        <span class="timestamp">[${msg.createdAt.toISOString()}]</span>:
                        <p>${msg.content || '(No content)'}</p>
                        ${
                            msg.attachments.size > 0
                                ? Array.from(msg.attachments.values())
                                      .map(
                                          (attachment) =>
                                              `<div class="attachment"><a href="${attachment.url}" target="_blank">${attachment.name}</a></div>`
                                      )
                                      .join('')
                                : ''
                        }
                    </div>
                `
                    )
                    .reverse()
                    .join('')}
            </div>
        </body>
        </html>`;

        const uniqueUsers = new Map();
            messages.forEach((msg) => {
             if (!uniqueUsers.has(msg.author.id)) {
                uniqueUsers.set(msg.author.id, msg.author);
            }
        });

        const embed = new EmbedBuilder()
            .setTitle(`Ticket Transcript: ${channel.name}`)
            .setDescription('Users involved in the ticket.')
            .setColor(0x00ff00)
            .setTimestamp();

        uniqueUsers.forEach((author) => {
            embed.addFields({
                name: `in ticket`,
                value: `<@${author.id}> - ${author.tag}`,
            });
        });
        embed.addFields({
            name: `in DM`,
            value: `<@${user.user.id}> - ${user.user.username}`,
        });

        await archiveChannel.send({
            content: `Transcript for ${channel.name}:`,
            files: [{ attachment: Buffer.from(transcriptHTML, 'utf-8'), name: `${channel.name}-transcript.html` }],
            embeds: [embed],
        });

        await user.send(`**Hello** ${user.user.username}**, your ticket has been closed. Thank you for reaching out.**`);

        await channel.delete();
        this.#logger.log('info', `Archived and deleted ticket channel: ${channel.name}`);

        delete this.#tickets[userId];
    }

    async onDiscordReady(guild, channels) {
        this.#logger.log('info', 'TicketSystem module is ready.');
        this.#logger.log('info', 'Registering additional callbacks.');

        this.#guild = guild;
        this.#discordChannels = channels;

        // Listen for direct messages to create tickets
        DiscordClient.on(Events.MessageCreate, async (message) => {
            if (message.partial) await message.fetch(); // Fetch partial messages
            if (message.author.bot || message.guild || message.channel.type !== ChannelType.DM) return;

            this.#logger.log('info', `Received DM from ${message.author.tag}: ${message.content}`);
            const user = message.author;

            try {
                if (!this.#tickets[user.id]) {
                    const channel = await this.#createTicketChannel(user);

                    //Forward text message
                    if (message.content) {
                        const ticketMessage = await channel.send(`**${user.tag}**:\n${message.content}`);
                        this.#messageMap.set(message.id, ticketMessage.id);
                        this.#messageMap.set(ticketMessage.id, message.id);
                    }
                    //Forward attachments
                    if (message.attachments.size > 0) {
                        for (const attachment of message.attachments.values()) {
                            await channel.send({
                                content: `**${user.tag}** sent an attachment:`,
                                files: [attachment],
                            });
                        }
                    }

                } else {
                    const ticketChannel = await this.#guild.channels.fetch(this.#tickets[user.id], { force: true });
                    if (ticketChannel) {
                        if (message.content) {
                            const ticketMessage = await ticketChannel.send(`**${user.tag}**:\n${message.content}`);
                            this.#messageMap.set(message.id, ticketMessage.id);
                            this.#messageMap.set(ticketMessage.id, message.id);
                        }
                        if (message.attachments.size > 0) {
                            for (const attachment of message.attachments.values()) {
                                await ticketChannel.send({
                                    content: `**${user.tag}** sent an attachment:`,
                                    files: [attachment],
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                this.#logger.log('error', `Failed to handle DM: ${error.message}`);
            }
        });

        DiscordClient.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
            if (newMessage.partial) await newMessage.fetch(); // Fetch partial messages
            if (newMessage.author.bot || !newMessage.guild || !Object.values(this.#tickets).includes(newMessage.channel.id)) return;
        
            this.#logger.log('info', `Message edited in ticket channel by ${newMessage.author.tag}: ${newMessage.content}`);
            const userId = Object.keys(this.#tickets).find((key) => this.#tickets[key] === newMessage.channel.id);
            if (!userId) return;
        
            try {
                const user = await this.#guild.members.fetch(userId);
                const dmMessageId = this.#messageMap.get(newMessage.id);
                if (dmMessageId) {
                    // Ensure the DM channel exists
                    if (!user.user.dmChannel) {
                        await user.user.createDM();
                    }
                    const dmMessage = await user.user.dmChannel.messages.fetch(dmMessageId);
                    if (dmMessage) {
                        await dmMessage.edit(`**${newMessage.author.tag}** : ${newMessage.content}`);
                        this.#messageMap.set(newMessage.id, dmMessage.id);
                        this.#messageMap.delete(oldMessage.id);
                    }
                }
            } catch (error) {
                this.#logger.log('error', `Failed to update DM message: ${error.message}`);
            }
        });
        
        // Add this event listener for message updates in DMs
        DiscordClient.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
            if (newMessage.partial) await newMessage.fetch(); // Fetch partial messages
            if (newMessage.author.bot || newMessage.guild || newMessage.channel.type !== ChannelType.DM) return;
        
            this.#logger.log('info', `DM edited by ${newMessage.author.tag}: ${newMessage.content}`);
            const ticketMessageId = this.#messageMap.get(oldMessage.id);
            if (ticketMessageId) {
                try {
                    const ticketChannel = await this.#guild.channels.fetch(this.#tickets[newMessage.author.id], { force: true });
                    const ticketMessage = await ticketChannel.messages.fetch(ticketMessageId);
                    if (ticketMessage) {
                        await ticketMessage.edit(`**${newMessage.author.tag}**:\n${newMessage.content}`);
                        this.#messageMap.set(newMessage.id, ticketMessage.id);
                        this.#messageMap.delete(oldMessage.id);
                    }
                } catch (error) {
                    this.#logger.log('error', `Failed to update ticket message: ${error.message}`);
                }
            }
        });

        // Listen for messages in ticket channels to forward to the user
        DiscordClient.on(Events.MessageCreate, async (message) => {
            if (message.author.bot || !message.guild || !Object.values(this.#tickets).includes(message.channel.id)) return;
        
            const userId = Object.keys(this.#tickets).find((key) => this.#tickets[key] === message.channel.id);
            if (!userId) return;
        
            try {
                const user = await this.#guild.members.fetch(userId);
                // Forward the text message
                if (message.content) {
                    const dmMessage = await user.send(`**${message.author.tag}** : ${message.content}`);
                    this.#logger.log('info', `Forwarded message to ${user.user.tag}: ${message.content}`);
                    this.#messageMap.set(message.id, dmMessage.id);
                    this.#messageMap.set(dmMessage.id, message.id);
                }  
                // Forward the attachments
                if (message.attachments.size > 0) {
                    for (const attachment of message.attachments.values()) {
                        await user.send({
                            content: `**${message.author.tag}** sent an attachment:`,
                            files: [attachment],
                        });
                        this.#logger.log('info', `Forwarded attachment to ${user.user.tag}: ${attachment.url}`);
                    }
                }
            } catch (error) {
                this.#logger.log('error', `Failed to forward message or attachment to user: ${error.message}`);
            }
        });
        // Listen for interaction events (button clicks)
        DiscordClient.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isButton()) return;

            if (interaction.partial) await interaction.fetch(); // Fetch partial interactions 

            const { customId, channelId } = interaction;

            if (customId.startsWith('archive-ticket-')) {
                this.#archiveAndDeleteTicket(channelId)
                    .then(() =>
                        interaction.reply({
                            content: 'Ticket has been archived and deleted.',
                            ephemeral: true,
                        })
                    )
                    .catch((error) =>
                        this.#logger.log('error', `Failed to archive ticket: ${error.message}`)
                    );
            }
        });
    }
};
