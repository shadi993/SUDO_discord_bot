import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Config } from '../../../core/config.mjs';

export const data = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user and log the action in the moderation channel.')
    .addUserOption(option => option.setName('target').setDescription('The user to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.deferReply({ ephemeral: true });

    // Embed for moderation log
    const modLogEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔨 User Kicked')
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            { name: 'User', value: `<@${target.id}> ID: ${target.id}`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        )
        .setTimestamp();

    try {
        // Kick the user
        const member = await interaction.guild.members.fetch(target.id);
        await member.kick(reason);

        const modChannelName = Config.moderation.channel_name; 
        const modChannel = interaction.guild.channels.cache.find(channel => channel.name === modChannelName);

        if (modChannel) {
            await modChannel.send({ embeds: [modLogEmbed] });
        } else {
            console.warn(`Moderation channel "${modChannelName}" not found.`);
        }

        await interaction.editReply({ content: `Successfully kicked ${target.tag}.` });
    } catch (err) {
        console.error('Error during kick command execution:', err);

        await interaction.editReply({ content: `Failed to kick ${target.tag}. They might not be in the server or another issue occurred.` });
    }
};
