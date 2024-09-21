import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { PostCountDboEntity } from '../../../core/database.mjs';

export const data = new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Set the XP of a user.')
    .addUserOption(option => option.setName('target').setDescription('The user to set XP for').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('The amount of XP to set').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);  

export async function execute(interaction) {
    const target = interaction.options.getUser('target');
    const xpAmount = interaction.options.getInteger('amount');

    // Fetch user from the database
    const userInfo = await PostCountDboEntity.findOne({ where: { discord_id: target.id } });

    // If user info doesn't exist, create a new entry
    if (!userInfo) {
        await interaction.reply({ content: `No record found for ${target.tag}. Creating a new one...`, ephemeral: true });
        const newUserInfo = new PostCountDboEntity({ discord_id: target.id, xp: xpAmount });
        await newUserInfo.save();
        await interaction.reply({ content: `${target.tag} has been set to ${xpAmount} XP.`, ephemeral: true });
        return;
    }

    // Update the user's XP
    userInfo.xp = xpAmount;
    await userInfo.save();

    const successEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`XP Set`)
        .setDescription(`Successfully set ${target.username}'s XP to ${xpAmount}.`)
        .setTimestamp();

    await interaction.reply({ embeds: [successEmbed], ephemeral: true });
}