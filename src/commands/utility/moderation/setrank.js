import { SlashCommandBuilder, PermissionFlagsBits} from 'discord.js';
import { PostCountDboEntity } from '../../../core/database.mjs';
import {calculateXPForLevel } from '../../../modules/leveling.mjs';

export const data = new SlashCommandBuilder()
    .setName('setrank')
    .setDescription('Set the rank of a user')
    .addUserOption(option => 
        option.setName('member')
        .setDescription('The member to set the rank for')
        .setRequired(true)
    )
    .addIntegerOption(option =>
        option.setName('level')
        .setDescription('The level to set the member to')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction) {
    const targetMember = interaction.options.getUser('member');
    const targetLevel = interaction.options.getInteger('level'); 


    if (!targetLevel) {
        return interaction.reply({ content: `Invalid level provided.`, ephemeral: true });
    }

    const xpForLevel = calculateXPForLevel(targetLevel);

    if (xpForLevel === undefined) {
        return interaction.reply({ content: `Invalid level provided.`, ephemeral: true });
    }

    // Fetch user from the database
    const dbResult = await PostCountDboEntity.findOne({ where: { discord_id: targetMember.id } });

    if (!dbResult) {
        return interaction.reply({ content: `User not found in the database.`, ephemeral: true });
    }

    // Update the user's XP to match the target level
    dbResult.xp = xpForLevel;
    await dbResult.save();


    await interaction.reply({ content: `Successfully set ${targetMember.username}'s level to ${targetLevel} with ${xpForLevel} XP!`, ephemeral: true });
}