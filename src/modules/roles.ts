import { CreateLogger } from '../core/logger.ts';
import { ActionRowBuilder, BaseMessageOptions, ButtonBuilder, ButtonStyle, CacheType, Collection, EmbedBuilder, Guild, GuildMember, Interaction, InteractionReplyOptions, Message, MessageEditOptions, MessagePayload, NonThreadGuildBasedChannel, Role, TextChannel } from 'discord.js';
import { Logger } from 'log4js';
import * as fs from 'node:fs';
import { Option, RoleChannel } from './roleChannel.ts';

/**
 * Module for handling roles.
 * Users on the server can assign themselves roles by clicking buttons.
 */
export class RolesModule {
    #logger : Logger;
    #roles: RoleChannel[];
    #discordChannels?: Collection<string, NonThreadGuildBasedChannel | null>;
    #discordRoles?: Collection<string, Role>;

    constructor() {
        this.#logger = CreateLogger('RolesModule');

        this.#roles = JSON.parse(fs.readFileSync('roles.json', 'utf-8'));

        if (!Array.isArray(this.#roles)) {
            this.#logger.log('error', 'Roles must be an array.');
            throw new Error('Roles must be an array.');
        }
    }

    async #createOrUpdateMessage(role: any) {
        // Find channel by name in the guild
        this.#logger.log('debug', `Looking for channel: ${role.channel_name}`);

        //find channel by id for future reference
        //const channel = this.#discordChannels.find((channel) => channel.id === role.channel_id);
        const channel = this.#discordChannels!.find((channel) => channel!.name === role.channel_name);

        if (!channel || !(channel instanceof TextChannel)) {
            this.#logger.log('error', `Channel not found: ${role.channel_name}`);
            throw new Error(`Channel not found: ${role.channel_name}`);
        }

        let messages = await channel.messages.fetch({ limit: 20 });
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
            await message.edit(generatedMessage);
        }
        else {
            //Create new message if it doesnt exist.
            this.#logger.log('info', `Message not found: ${role.title}`);
            await channel.send(generatedMessage);
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
        for (const role of this.#roles) {
            this.#createOrUpdateMessage(role);
        }
    }

    async onDiscordInteraction(interaction: Interaction<CacheType>) {
        if (!interaction.isButton())
            return;

        const customIds: string[] = interaction.customId.split('_');
        const action: string = customIds[0];
        const roleId: number = parseInt(customIds[1]);
        const optionIndex: number = parseInt(customIds[2]);

        if (action !== 'roleselection') return;

        this.#logger.log('debug', `Received button press from user ${interaction.user.tag} ${interaction.customId}`);
        console.log(JSON.stringify(roleId));
        console.log(JSON.stringify(this.#roles))
        const role = this.#roles[roleId];

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

    constructor(role: RoleChannel) {
        let buttons: ButtonBuilder[] = [];

        for (let i = 0; i < role.options.length; i++) {
            this.#generateButton(role, role.options[i], i, buttons);
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

    #generateButton(role: RoleChannel, option: Option, i: number, buttons: ButtonBuilder[]) {
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