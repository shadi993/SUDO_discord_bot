import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Config } from '../../../core/config.mjs';
import { purgeUserMessages } from './purge.mjs';

export const data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user and log the action in the moderation channel.')
    .addUserOption(option => option.setName('target').setDescription('The user to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .addStringOption(option => option
        .setName('purge')
        .setDescription('Delete the target user’s messages')
        .setRequired(false)
        .addChoices(
            { name: 'Last hour', value: 'hour' },
            { name: 'Last day', value: 'day' },
            { name: 'All messages', value: 'all' },
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
    if (!Config.moderation.enabled) return interaction.reply({ content: 'Moderation is disabled.', ephemeral: true });
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const purge = interaction.options.getString('purge');

    await interaction.deferReply({ ephemeral: true });

    // Embed for moderation log
    const modLogEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🔨 User Banned')
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            { name: 'User', value: `<@${target.id}> ID: ${target.id}`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        )
        .setTimestamp();

    try {
        // Ban the user
        const member = await interaction.guild.members.fetch(target.id);
        await member.ban({ reason });
        const purged = purge ? await purgeUserMessages(interaction.guild, target.id, purge) : 0;

        const modChannelName = Config.moderation.channel_name; 
        const modChannel = interaction.guild.channels.cache.find(channel => channel.id === modChannelName || channel.name === modChannelName);

        if (modChannel) {
            await modChannel.send({ embeds: [modLogEmbed] });
        } else {
            console.warn(`Moderation channel "${modChannelName}" not found.`);
        }

        await interaction.editReply({ content: `Successfully banned ${target.tag}.${purge ? ` Deleted ${purged} message${purged === 1 ? '' : 's'} from the selected period.` : ''}` });
    } catch (err) {
        console.error('Error during ban command execution:', err);

        await interaction.editReply({ content: `Failed to ban ${target.tag}. They might not be in the server or another issue occurred.` });
    }
};
