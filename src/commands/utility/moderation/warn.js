import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Config } from '../../../core/config.mjs'; 

export const data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user and send them a DM.')
    .addUserOption(option => option.setName('target').setDescription('The user to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');

    await interaction.deferReply({ ephemeral: true });

    // embed for user's dm
    const warnEmbed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('⚠️ You have been warned!')
        .addFields(
            { name: 'Reason', value: reason },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Guild', value: `${interaction.guild.name}`, inline: true },
        )
        .setTimestamp();

    // embed for moderation log
    const modLogEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔨 User Warned')
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            { name: 'User', value: `<@${target.id}> (${target.id})`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        )
        .setTimestamp();

    try {
        await target.send({ embeds: [warnEmbed] });


        const modChannelName = Config.moderation.channel_name; 
        const modChannel = interaction.guild.channels.cache.find(channel => channel.name === modChannelName);

        if (modChannel) {
            await modChannel.send({ embeds: [modLogEmbed] });
        } else {
            console.warn(`Moderation channel "${modChannelName}" not found.`);
        }

        await interaction.editReply({ content: `Successfully warned ${target.tag}.` });
    } catch (err) {
        console.error('Error during warn command execution:', err);

        await interaction.editReply({ content: `Failed to warn ${target.tag}. They might have DMs disabled or another issue occurred.` });
    }
};
