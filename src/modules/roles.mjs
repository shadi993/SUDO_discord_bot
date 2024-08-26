// This is the roles module. It handles role assignment and rule acceptance in the server

import { CreateLogger } from '../core/logger.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

import * as fs from 'node:fs';

export const RolesModule = class {
    constructor() {
        this.logger = CreateLogger('RolesModule');

        this.roles = JSON.parse(fs.readFileSync('roles.json'));

        if (!Array.isArray(this.roles)) {
            this.logger.log('error', 'Roles must be an array.');
            throw new Error('Roles must be an array.');
        }
    }

    async onDiscordReady(guild, channels, roles) {
        this.logger.log('info', 'Channels loaded. Roles module is loading...');

        this.discordGuild = guild;
        this.discordRoles = roles;

        for (const role of this.roles) {

            // Find channel by name in the guild
            this.logger.log('debug', `Looking for channel: ${role.channel_name}`);
            const channel = channels.find((channel) => channel.name === role.channel_name);

            if (!channel) {
                this.logger.log('error', `Channel not found: ${role.channel_name}`);
                throw new Error(`Channel not found: ${role.channel_name}`);
            }

            channel.messages.fetch({ limit: 20 }).then(async (messages) => {
                this.logger.log('debug', `Registering role: ${role.title}`);
                this.logger.log('info', `Fetched ${messages.size} messages.`);

                const message = messages.find((message) => message.author.id === process.env.DISCORD_CLIENT_ID &&
                    message.embeds.length > 0 &&
                    message.embeds[0].title === role.title);

                // The message already exists. Edit it (TODO)
                if (message) {
                    this.logger.log('info', `Message found: ${role.title}. Updating...`);
                    return;
                }

                if (!message) {
                    this.logger.log('info', `Message not found: ${role.title}`);

                    // Create the buttons
                    var buttons = [];
                    var optionIndex = 0;
                    for (const option of role.options) {
                        var button = new ButtonBuilder()
                            .setCustomId('roleselection_' + role.id + '_' + optionIndex)
                            .setStyle(this.getButtonStyleFromString(option.button_style))

                        if (option.button_text) {
                            button.setLabel(option.button_text)
                        } else {
                            button.setLabel('\u200B')
                        }

                        if (option.button_emoji) {
                            button.setEmoji(option.button_emoji);
                        }

                        buttons.push(button);
                        optionIndex++;
                    }

                    // Split up rows if there are more than 5 buttons
                    var rows = [];
                    while (buttons.length > 0) {
                        rows.push(new ActionRowBuilder()
                            .addComponents(buttons.splice(0, 5))
                        );
                    }

                    const embed = new EmbedBuilder()
                        .setTitle(role.title)
                        .setDescription(" ")
                        .setColor(0x0099FF);

                    var fieldDescription = "";
                    for (const option of role.options) {
                        fieldDescription += option.description + "\n";
                    }

                    embed.addFields({
                        name: '\u200B',
                        value: fieldDescription,
                        inline: false
                    });

                    await channel.send({
                        embeds: [embed],
                        components: rows
                    });
                }
            });
        }

        this.logger.log('info', 'Roles module is ready.');
    }

    async onDiscordInteraction(interaction) {
        if (!interaction.isButton())
            return;

        const [action, roleId, optionIndex] = interaction.customId.split('_');

        if (action !== 'roleselection') return;

        this.logger.log('debug', `Received button press from user ${interaction.user.tag} ${interaction.customId}`);

        const role = this.roles.find((role) => role.id === Number(roleId));

        if (!role) {
            this.logger.log('warning', `Received button press for unknown role: ${roleId} from user: ${interaction.user.tag}`);
            return;
        }

        const option = role.options[optionIndex];

        if (!option) {
            this.logger.log('warning', `Received button press for unknown option: ${optionIndex} from user: ${interaction.user.tag}`);
            return;
        }

        this.logger.log('info', `Received button press from user ${interaction.user.tag} for role '${role.title}' option '${option.description}'`);

        // Reply that it is okay
        // TODO: Can we do a reply without any content? This is a workaround to avoid the "This interaction failed" message
        interaction.reply({ content: 'OK', fetchReply: true })
            .then((message) => message.delete())
            .catch(console.error);

        // Check if the user has the role
        const member = interaction.member;
        const discordRole = this.discordRoles.find((discordRole) => discordRole.name === option.role_name);

        if (member.roles.cache.find((memberRole) => memberRole.id === discordRole.id)) {
            // Only remove if toggle is set to false.
            // This is used by the accept rules button which should not be removed.
            if (option.toggle !== false) {
                this.logger.log('info', `User ${interaction.user.tag} already has role '${option.role_name}'. Removing...`);
                member.roles.remove(discordRole);
            } else {
                this.logger.log('info', `User ${interaction.user.tag} already has role '${option.role_name}'. Ignoring due to toggle=false`);
            }
        } else {
            this.logger.log('info', `User ${interaction.user.tag} does not have role '${option.role_name}'. Adding...`);
            member.roles.add(discordRole);
        }
    }

    getButtonStyleFromString(style) {
        switch (style) {
            case 'Primary':
                return ButtonStyle.Primary;
            case 'Secondary':
                return ButtonStyle.Secondary;
            case 'Success':
                return ButtonStyle.Success;
            case 'Danger':
                return ButtonStyle.Danger;
            case 'Link':
                return ButtonStyle.Link;
            default:
                return ButtonStyle.Secondary;
        }
    }
};
