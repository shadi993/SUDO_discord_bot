import { CreateLogger } from '../core/logger.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import * as fs from 'node:fs';
import { PostCountDboEntity } from '../core/database.mjs';
import { LevelingModule } from '../modules/leveling.mjs';

/**
 * Module for handling roles.
 * Users on the server can assign themselves roles by clicking buttons.
 */

export const RolesModule = class {
    #logger
    #roles
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
        } else {
            //Create new message if it doesnt exist.
            this.#logger.log('info', `Message not found: ${role.title}`);
            await channel.send(generatedMessage);
        };
    }

    async onDiscordReady(guild, channels, roles) {
        this.#logger.log('info', 'Channels loaded. Roles module is loading...');

        this.#discordChannels = channels;
        this.#discordRoles = roles;

        //this function should be moved in a singular class so it can also be called from a command so you dont have to restart the bot after adding or removing roles.
        for (const role of this.#roles) {
            this.#createOrUpdateMessage(role);
        }
    }

    async onDiscordInteraction(interaction) {
        if (!interaction.isButton()) return;
    
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
    
        // Check level requirements if defined
        if (option.requirements && option.requirements.level) {
            const userInfo = await PostCountDboEntity.findOne({ where: { discord_id: interaction.user.id } });
    
            if (!userInfo) {
                await interaction.reply({ content: `You do not meet the level requirements for this role.`, ephemeral: true });
                return;
            }
    
            const userLevel = LevelingModule.calculateLevel(userInfo.xp);
    
            if (userLevel < option.requirements.level) {
                await interaction.reply({ content: `You need to be at least level ${option.requirements.level} to get this role.`, ephemeral: true });
                return;
            }
        }
    
        this.#logger.log('info', `Received button press from user ${interaction.user.tag} for role '${role.title}' option '${option.description}'`);
    
        const member = interaction.member;
        const discordRole = this.#discordRoles.find((discordRole) => discordRole.name === option.role_name);
    
        if (!discordRole) {
            this.#logger.log('error', `Role '${option.role_name}' does not exist in the current guild.`);
            return;
        }
    
        // Handle exclusive group
        const isExclusiveGroup = role.exclusive_group ?? false;
    
        if (isExclusiveGroup) {
            this.#logger.log('info', `Role '${role.title}' is part of an exclusive group.`);
    
            const exclusiveRoles = role.options
                .map((opt) => this.#discordRoles.find((r) => r.name === opt.role_name))
                .filter((r) => r && member.roles.cache.has(r.id)); // Roles the member currently has in this group
    
            for (const exclusiveRole of exclusiveRoles) {
                if (exclusiveRole.id !== discordRole.id) {
                    await member.roles.remove(exclusiveRole);
                    this.#logger.log('info', `Removed exclusive role '${exclusiveRole.name}' from user ${interaction.user.tag}.`);
                }
            }
        }
    
        let roleAction = "";
    
        if (member.roles.cache.has(discordRole.id)) {
            if (option.toggle !== false) {
                this.#logger.log('info', `User ${interaction.user.tag} already has role '${option.role_name}'. Removing...`);
                await member.roles.remove(discordRole);
                roleAction = 'Revoke';
            } else {
                this.#logger.log('info', `User ${interaction.user.tag} already has role '${option.role_name}'. Ignoring due to toggle=false.`);
            }
        } else {
            this.#logger.log('info', `User ${interaction.user.tag} does not have role '${option.role_name}'. Adding...`);
            await member.roles.add(discordRole);
            roleAction = 'Assigned';
        }
    
        await interaction.reply({
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
            this.#rows.push(new ActionRowBuilder().addComponents(buttons.splice(0, 5)));
        }

        this.#embed = new EmbedBuilder()
            .setTitle(role.title)
            .setColor(0x0099FF)
            .addFields({
                name: '\u200B',
                value: role.options.map(option =>
                    `${option.description} ${option.level_required ? `(Level ${option.level_required}+)` : ''} ${option.xp_required ? `(${option.xp_required} XP+)` : ''}`
                ).join('\n'),
                inline: false
            });
    }

    #generateButton(role, option, i, buttons) {
        const button = new ButtonBuilder()
            .setCustomId('roleselection_' + role.id + '_' + i)
            .setStyle(this.#getButtonStyleFromString(option.button_style))
            .setLabel(option.button_text || '\u200B');
        
        if (option.button_emoji) {
            button.setEmoji(option.button_emoji);
        }
    
        buttons.push(button);
    }

    #getButtonStyleFromString(style) {
        switch (style) {
            case 'Primary': return ButtonStyle.Primary;
            case 'Secondary': return ButtonStyle.Secondary;
            case 'Success': return ButtonStyle.Success;
            case 'Danger': return ButtonStyle.Danger;
            case 'Link': return ButtonStyle.Link;
            default: return ButtonStyle.Secondary;
        }
    }

    getEmbed() {
        return this.#embed;
    }

    getRows() {
        return this.#rows;
    }
};
