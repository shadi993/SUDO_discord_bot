import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Config } from '../../../core/config.mjs';

export const data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user and send them a DM.')
    .addUserOption(option => option.setName('target').setDescription('The user to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the warning').setRequired(true))
    .addIntegerOption(option => option.setName('timeout').setDescription('Timeout duration in minutes (optional)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');
    const timeout = interaction.options.getInteger('timeout');

    await interaction.deferReply({ ephemeral: true });

    const member = interaction.guild.members.cache.get(target.id);
    if (!member) {
        return interaction.editReply({ content: `Failed to warn ${target.tag} as they are not in the server.` });
    }

    const timeoutInfo = timeout 
        ? `The user has been timed out for ${timeout} minute(s).` 
        : 'No timeout applied.';

    const timeoutTimestamp = timeout 
        ? Math.floor((Date.now() + timeout * 60 * 1000) / 1000) 
        : null;

    // Embed for user's DM
    const warnEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('⚠️ You have been warned!')
        .addFields(
            { name: 'Reason', value: reason },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Guild', value: `${interaction.guild.name}`, inline: true },
            ...(timeout
                ? [
                    { name: 'Timeout Duration', value: `${timeout} minute(s)` },
                    { name: 'Timeout Ends', value: `<t:${timeoutTimestamp}:F>` },
                ]
                : [])
        )
        .setTimestamp();

    // Embed for moderation log
    const modLogEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔨 User Warned')
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            { name: 'User', value: `<@${target.id}> ID: ${target.id}`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            ...(timeout
                ? [
                    { name: 'Timeout Duration', value: `${timeout} minute(s)` },
                    { name: 'Timeout Ends', value: `<t:${timeoutTimestamp}:F>` },
                ]
                : [])
        )
        .setTimestamp();

    try {
        // Send the warning DM
        await target.send({ embeds: [warnEmbed] });

        if (timeout) {
            await member.timeout(timeout * 60 * 1000, `Warned by ${interaction.user.tag}: ${reason}`);
        }

        // Log the warning in the moderation channel
        const modChannelName = Config.moderation.channel_name; 
        const modChannel = interaction.guild.channels.cache.find(channel => channel.name === modChannelName);

        if (modChannel) {
            await modChannel.send({ embeds: [modLogEmbed] });
        } else {
            console.warn(`Moderation channel "${modChannelName}" not found.`);
        }

        await interaction.editReply({
            content: `Successfully warned ${target.tag}. ${timeoutInfo}`
        });
    } catch (err) {
        console.error('Error during warn command execution:', err);

        await interaction.editReply({content: `Failed to warn ${target.tag}. They might have DMs disabled or another issue occurred.`});
    }
};