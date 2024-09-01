import { ActionRowBuilder, BaseMessageOptions, ButtonBuilder, ButtonStyle, CacheType, Collection, EmbedBuilder, Guild, GuildMember, Interaction, Message, NonThreadGuildBasedChannel, Role, TextChannel } from 'discord.js';
import { Logger } from 'log4js';
import * as fs from 'node:fs';
import { CreateLogger } from '../core/logger.ts';
import { RoleOption, RoleSelectionPromt } from './models/roleSelectionPrompt.model.ts';

/**
 * Module for handling roles.
 * Users on the server can assign themselves roles by clicking buttons.
 */
export class RolesModule {
    #logger : Logger;
    #discordChannels?: Collection<string, NonThreadGuildBasedChannel | null>;
    #discordRoles?: Collection<string, Role>;
    static #instance: RolesModule;

    private constructor() {
        this.#logger = CreateLogger('RolesModule');
    }

    static get instance(): RolesModule{
        if(!RolesModule.#instance){
            this.#instance = new RolesModule();
        }
        return this.#instance
    }

    async updateRolesFromJson() {
        this.#logger.log(`Loading data from JSON`)
        const roleSelectionPrompts = JSON.parse(fs.readFileSync('roles.json', 'utf-8')) as RoleSelectionPromt[];
        for(let roleSelectionPromptFromJSON of roleSelectionPrompts){
            let roleSelectionPrompt: RoleSelectionPromt = await RoleSelectionPromt.findOrBuild(
                {where: {roleSelectionPromptId: roleSelectionPromptFromJSON.roleSelectionPromptId},
            defaults: {
                channel_name: roleSelectionPromptFromJSON.channel_name,
                roleSelectionPromptId: roleSelectionPromptFromJSON.roleSelectionPromptId,
                title: roleSelectionPromptFromJSON.title
            }}).then(result => result[0].save())
            for(let option of roleSelectionPromptFromJSON.options) {
                await RoleOption.findOrBuild({where: {role_name: option.role_name}, 
                    defaults: {
                        roleID: option.roleID, 
                        description: option.description,
                        role_name: option.role_name,
                        button_text: option.button_text,
                        button_emoji: option.button_emoji,
                        button_style: option.button_style,
                        toggle: option.toggle,
                        associatedColor: option.associatedColor,
                        roleSelectionPromptId: roleSelectionPrompt.roleSelectionPromptId
                    }}).then(ab => ab[0].save());
            }
        }
        this.#logger.log(`Done Loading data from JSON`)
        this.setupRoles();
    }

    async #createOrUpdateMessage(role: RoleSelectionPromt): Promise<Message<true>> {
        // Find channel by name in the guild
        this.#logger.log('debug', `Looking for channel: ${role.channel_name}`);

        //find channel by id for future reference
        //const channel = this.#discordChannels.find((channel) => channel.id === role.channel_id);
        const channel = this.#discordChannels?.find((channel) => channel!.name === role.channel_name);
        
        if (!channel || !(channel instanceof TextChannel)) {
            this.#logger.log('error', `Channel not found: ${role.channel_name}`);
            throw new Error(`Channel not found: ${role.channel_name}`);
        }

        const messages = await channel.messages.fetch({ limit: 20 });
        return await this.#updateOrCreateMessages(channel, role, messages);
    }

    #updateOrCreateMessages(channel: TextChannel, role: RoleSelectionPromt, messages: Collection<string, Message<true>>): Promise<Message<true>> {
        this.#logger.log('debug', `Registering role: ${role.title}`);
        this.#logger.log('info', `Fetched ${messages.size} messages.`);

        //Message id's should be stored in the database once this is ready. Searching on title is not unique.
        let message: Message<true> | undefined = messages.find((message) =>
            message.author.id === process.env.DISCORD_CLIENT_ID &&
            message.embeds.length > 0 &&
            message.embeds[0].title === role.title);

        let embedGenerator = new ButtonEmbedGenerator(role);
        let generatedMessage: BaseMessageOptions = {
            embeds: [embedGenerator.getEmbed()],
            components: embedGenerator.getRows()
        };

        if (message) {
            //Update message if it already exists.
            this.#logger.log('info', `Message found: ${role.title}. Updating...`);
            return message.edit(generatedMessage);
        } else {
            //Create new message if it doesnt exist.
            this.#logger.log('info', `Message not found: ${role.title}`);
            return channel.send(generatedMessage);
        };
    }

    async onDiscordReady(
            guild: Guild,
            channels: Collection<string, NonThreadGuildBasedChannel | null>,
            roles: Collection<string, Role>) {
        this.#logger.log('info', 'Channels loaded. Roles module is loading...');

        this.#discordChannels = channels;
        this.#discordRoles = roles;

        //this function should be moved in a singular class so it can also be called from a command so you dont have to restart the bot after adding or removing roles.
        await this.setupRoles();
    }

    async setupRoles() {
        var promises: Promise<Message<true>>[] = []
        const roles = await RoleSelectionPromt.findAll({include: [RoleOption]});
        
        for (const role of roles) {
            promises.push(this.#createOrUpdateMessage(role));
        }
        return promises;
    }

    async onDiscordInteraction(interaction: Interaction<CacheType>) {
        if (!interaction.isButton())
            return;

        const customIds: string[] = interaction.customId.split('_');
        const action: string = customIds[0];
        const roleSelectionId: number = parseInt(customIds[1]);
        const roleOptionId: number = parseInt(customIds[2]);
 
        if (action !== 'roleselection') return;

        console.log(JSON.stringify(customIds));
        
        this.#logger.log('debug', `Received button press from user ${interaction.user.tag} ${interaction.customId}`);

        const option = await RoleOption.findOne({where: {roleID: roleOptionId}});

        if (!option) {
            this.#logger.log('warning', `Received button press for unknown option: ${roleOptionId} from user: ${interaction.user.tag}`);
            return;
        }

        this.#logger.log('info', `Received button press from user ${interaction.user.tag} for role '${option.role_name}' option '${option.description}'`);

        // Check if the user has the role
        const member: GuildMember = interaction.member as GuildMember;
        const discordRole = this.#discordRoles?.find((discordRole) => discordRole.name === option.role_name);

        //Check if role exists in guild
        if (!discordRole) {
            this.#logger.log('error', `Role '${option.role_name}' does not exist in current guild.`);
            return;
        }

        var roleAction = "";

        if (member && member.roles.cache.find((memberRole) => memberRole.id === discordRole.id)) {
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

class ButtonEmbedGenerator {
    private embed: EmbedBuilder;
    private rows: ActionRowBuilder<ButtonBuilder>[]

    constructor(role: RoleSelectionPromt) {
        let buttons: ButtonBuilder[] = [];

        for (let option of role.options) {
            this.#generateButton(role, option, buttons);
        }

        // Split up rows if there are more than 5 buttons
        this.rows = [];
        while (buttons.length > 0) {
            this.rows.push(new ActionRowBuilder<ButtonBuilder>()
                .addComponents(buttons.splice(0, 5))
            );
        }

        this.embed = new EmbedBuilder()
            .setTitle(role.title)
            .setDescription(" ")
            .setColor(0x0099FF);

        var fieldDescription = "";
        for (const option of role.options) {
            fieldDescription += option.description + "\n";
        }

        this.embed.addFields({
            name: '\u200B',
            value: fieldDescription,
            inline: false
        });
    }

    #generateButton(role: RoleSelectionPromt, option: RoleOption, buttons: ButtonBuilder[]) {
        var button = new ButtonBuilder()
            .setCustomId('roleselection_' + role.roleSelectionPromptId + '_' + option.roleID)
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

    #getButtonStyleFromString(style: string) {
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
        return this.embed;
    }

    getRows() {
        return this.rows;
    }
}