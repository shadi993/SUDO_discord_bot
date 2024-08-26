// This is the roles module. It handles role assignment and rule acceptance in the server

import { CreateLogger } from '../core/logger.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

import * as fs from 'node:fs';

export const RolesModule = class {
    #logger
    #roles
    #discordGuild
    #discordChannels
    #discordRoles

    constructor() {
        this.#logger = CreateLogger('RolesModule');

        this.#roles = JSON.parse(fs.readFileSync('roles.json'));

        if (!Array.isArray(this.#roles)) {
            this.#logger.log('error', 'Roles must be an array.');
            throw new Error('Roles must be an array.');
        }
    }

    async #createOrUpdateMessage(role) {
        // Find channel by name in the guild
        this.#logger.log('debug', `Looking for channel: ${role.channel_name}`);

        //find channel by id for future reference
        //const channel = this.#discordChannels.find((channel) => channel.id === role.channel_id);
        const channel = this.#discordChannels.find((channel) => channel.name === role.channel_name);

        if (!channel) {
            this.#logger.log('error', `Channel not found: ${role.channel_name}`);
            throw new Error(`Channel not found: ${role.channel_name}`);
        }

        let messages = await channel.messages.fetch({ limit: 20 });
        this.#logger.log('debug', `Registering role: ${role.title}`);
        this.#logger.log('info', `Fetched ${messages.size} messages.`);

        //Message id's should be stored in the database once this is ready. Searching on title is not unique.
        let message = messages.find((message) =>
            message.author.id === process.env.DISCORD_CLIENT_ID &&
            message.embeds.length > 0 &&
            message.embeds[0].title === role.title);

        let embedGenerator = new ButtonEmbedGenerator(role);
        let generatedMessage = {
            embeds: [embedGenerator.getEmbed()],
            components: embedGenerator.getRows()
        };

        if (message) {
            //Update message if it already exists.
            this.#logger.log('info', `Message found: ${role.title}. Updating...`);
            await message.edit(generatedMessage);
        }
        else {
            //Create new message if it doesnt exist.
            this.#logger.log('info', `Message not found: ${role.title}`);
            await channel.send(generatedMessage);
        };
    }

    async onDiscordReady(guild, channels, roles) {
        this.#logger.log('info', 'Channels loaded. Roles module is loading...');

        this.#discordGuild = guild;
        this.#discordChannels = channels;
        this.#discordRoles = roles;

        //this function should be moved in a singular class so it can also be called from a command so you dont have to restart the bot after adding or removing roles.
        for (const role of this.#roles) {
            this.#createOrUpdateMessage(role);
        }
    }

    async onDiscordInteraction(interaction) {
        if (!interaction.isButton())
            return;

        const [action, roleId, optionIndex] = interaction.customId.split('_');

        if (action !== 'roleselection') return;

        this.#logger.log('debug', `Received button press from user ${interaction.user.tag} ${interaction.customId}`);

        const role = this.#roles.find((role) => role.id === Number(roleId));

        if (!role) {
            this.#logger.log('warning', `Received button press for unknown role: ${roleId} from user: ${interaction.user.tag}`);
            return;
        }

        const option = role.options[optionIndex];

        if (!option) {
            this.#logger.log('warning', `Received button press for unknown option: ${optionIndex} from user: ${interaction.user.tag}`);
            return;
        }

        this.#logger.log('info', `Received button press from user ${interaction.user.tag} for role '${role.title}' option '${option.description}'`);

        // Check if the user has the role
        const member = interaction.member;
        const discordRole = this.#discordRoles.find((discordRole) => discordRole.name === option.role_name);

        //Check if role exists in guild
        if (!discordRole) {
            this.#logger.log('error', `Role '${option.role_name}' does not exist in current guild.`);
            return;
        }

        var roleAction = "";

        if (member.roles.cache.find((memberRole) => memberRole.id === discordRole.id)) {
            // Only remove if toggle is set to false.
            // This is used by the accept rules button which should not be removed.
            if (option.toggle !== false) {
                this.#logger.log('info', `User ${interaction.user.tag} already has role '${option.role_name}'. Removing...`);
                member.roles.remove(discordRole);
                roleAction = 'Revoke'
            } else {
                this.#logger.log('info', `User ${interaction.user.tag} already has role '${option.role_name}'. Ignoring due to toggle=false`);
            }
        } else {
            this.#logger.log('info', `User ${interaction.user.tag} does not have role '${option.role_name}'. Adding...`);
            member.roles.add(discordRole);
            roleAction = 'Assigned'
        }

        interaction.reply({
            embeds: [{
                title: `${roleAction} role`,
                description: `${option.role_name}`
            }],
            ephemeral: true
        });
    }
};

const ButtonEmbedGenerator = class {
    #embed
    #rows

    constructor(role) {
        let buttons = [];

        for (let i = 0; i < role.options.length; i++) {
            this.#generateButton(role, role.options[i], i, buttons);
        }

        // Split up rows if there are more than 5 buttons
        this.#rows = [];
        while (buttons.length > 0) {
            this.#rows.push(new ActionRowBuilder()
                .addComponents(buttons.splice(0, 5))
            );
        }

        this.#embed = new EmbedBuilder()
            .setTitle(role.title)
            .setDescription(" ")
            .setColor(0x0099FF);

        var fieldDescription = "";
        for (const option of role.options) {
            fieldDescription += option.description + "\n";
        }

        this.#embed.addFields({
            name: '\u200B',
            value: fieldDescription,
            inline: false
        });
    }

    #generateButton(role, option, i, buttons) {
        var button = new ButtonBuilder()
            .setCustomId('roleselection_' + role.id + '_' + i)
            .setStyle(this.#getButtonStyleFromString(option.button_style));

        if (option.button_text) {
            button.setLabel(option.button_text);
        } else {
            button.setLabel('\u200B');
        }

        if (option.button_emoji) {
            button.setEmoji(option.button_emoji);
        }

        buttons.push(button);
    }

    #getButtonStyleFromString(style) {
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

    getEmbed() {
        return this.#embed;
    }

    getRows() {
        return this.#rows;
    }
}