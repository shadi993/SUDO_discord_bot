import { SlashCommandBuilder, CommandInteraction, SlashCommandStringOption, CommandInteractionOptionResolver, ButtonStyle } from 'discord.js';
import { RolesModule } from '../../modules/roles.ts'
import { RoleOption } from '../../modules/models/roleSelectionPrompt.model.ts';

export const data = new SlashCommandBuilder()
    .setName('addlanguage')
    .setDescription('Adds a Dev Language')
    .addStringOption((option: SlashCommandStringOption) =>
        option.setName('role_name').setDescription('Role name in Profile - ID').setRequired(true))
    .addStringOption((option: SlashCommandStringOption) =>
        option.setName('description').setDescription('Shown in the List').setRequired(true))
    .addStringOption((option: SlashCommandStringOption) =>
        option.setName('button_emoji').setDescription('Emote for the Button'))
    .addStringOption((option: SlashCommandStringOption) =>
        option.setName('button_text').setDescription('Text for the Button'))
    .addStringOption((option: SlashCommandStringOption) =>
        option.setName('button_style')
        .setDescription('Button Type, leave empty if Secondary')
        .addChoices(
            {name: 'Primary', value: 'Primary'},
            {name: 'Secondary', value: 'Secondary'},
            {name: 'Success', value: 'Success'},
            {name: 'Danger', value: 'Danger'}
        ))
    .addStringOption((option: SlashCommandStringOption) =>
        option.setName('color').setDescription('Associated Color, leave empty if none'));

export async function execute(interaction: CommandInteraction<'cached'>) {
    var options = interaction.options as CommandInteractionOptionResolver<"cached">
    let roleOption: RoleOption = new RoleOption();
    roleOption.role_name = options.getString('role_name')!
    roleOption.description = options.getString('description')!
    roleOption.button_emoji = options.getString('button_emoji')!
    roleOption.button_text = options.getString('button_text') || ''
    roleOption.button_style = options.getString('button_style') || 'Secondary'
    roleOption.associatedColor = options.getString('color') || '';
    roleOption.roleSelectionPromptId = 0;

    await roleOption.save();
    await (RolesModule.instance).setupRoles().then(fin => interaction.reply('Done'));
}
