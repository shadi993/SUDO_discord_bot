import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { RolesModule } from '../../modules/roles.ts';

export const data = new SlashCommandBuilder()
    .setName('load_from_json')
    .setDescription('Loads the base Role configs from JSON');
export async function execute(interaction: CommandInteraction<'cached'>) {
    await (RolesModule.instance).updateRolesFromJson();
    await interaction.reply('Done')
}