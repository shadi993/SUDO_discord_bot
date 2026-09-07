import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Config } from '../../../core/config.mjs';

// Discord's maximum timeout is 28 days.
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

export const data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user and optionally apply a timeout.')
    .addUserOption(option => option.setName('target').setDescription('The user to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the warning').setRequired(true))
    .addStringOption(option => option.setName('timeout_type').setDescription('Choose the timeout unit or maximum timeout').setRequired(false)
            .addChoices({name: 'Minutes',value: 'minutes',},{name: 'Hours',value: 'hours',},{name: 'Maximum (28 days)',value: 'max',}))
    .addIntegerOption(option => option.setName('timeout').setDescription('Timeout duration. Not needed when using Maximum.').setMinValue(1).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction) {
    if (!Config.moderation.enabled) return interaction.reply({ content: 'Moderation is disabled.', ephemeral: true });
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');
    const timeoutType = interaction.options.getString('timeout_type');
    const timeoutValue = interaction.options.getInteger('timeout');

    await interaction.deferReply({ ephemeral: true });

    try {
        const guild = interaction.guild;

        if (!guild) {
            return await interaction.editReply({
                content: 'This command can only be used inside a server.',
            });
        }

        const member = await guild.members.fetch(target.id);

        if (!member) {
            return await interaction.editReply({
                content: `Failed to warn ${target.tag} because they are not in the server.`,
            });
        }

        if (timeoutType === 'max' && timeoutValue !== null) {
            return await interaction.editReply({
                content:
                    'When using **Maximum**, do not enter a timeout duration.',
            });
        }

        if (
            (timeoutType === 'minutes' || timeoutType === 'hours') &&
            timeoutValue === null
        ) {
            return await interaction.editReply({
                content:
                    `You selected **${timeoutType}**, so you must provide a timeout duration.`,
            });
        }

        if (timeoutValue !== null && !timeoutType) {
            return await interaction.editReply({
                content:
                    'You provided a timeout duration but did not select a timeout type. Choose **Minutes**, **Hours**, or **Maximum**.',
            });
        }

        let timeoutMs = null;
        let timeoutDisplay = null;

        if (timeoutType === 'minutes') {
            timeoutMs = timeoutValue * 60 * 1000;
            timeoutDisplay = `${timeoutValue} minute(s)`;
        }

        if (timeoutType === 'hours') {
            timeoutMs = timeoutValue * 60 * 60 * 1000;
            timeoutDisplay = `${timeoutValue} hour(s)`;
        }

        if (timeoutType === 'max') {
            timeoutMs = MAX_TIMEOUT_MS;
            timeoutDisplay = '28 days (maximum)';
        }

        if (timeoutMs !== null && timeoutMs > MAX_TIMEOUT_MS) {
            return await interaction.editReply({
                content:
                    'The maximum Discord timeout is **28 days**. Please enter a shorter duration.',
            });
        }

        if (timeoutMs !== null && !member.moderatable) {
            return await interaction.editReply({
                content:
                    `I cannot timeout ${target.tag}. Their highest role is higher than or equal to my highest role, or I do not have permission to timeout them.`,
            });
        }

        const timeoutTimestamp =
            timeoutMs !== null
                ? Math.floor((Date.now() + timeoutMs) / 1000)
                : null;

        const timeoutInfo =
            timeoutMs !== null
                ? `The user has been timed out for ${timeoutDisplay}.`
                : 'No timeout applied.';

        // Embed for user's DM
        const warnEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('⚠️ You have been warned!')
            .addFields(
                { name: 'Reason', value: reason },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Guild', value: `${guild.name}`, inline: true },
                ...(timeoutMs !== null
                    ? [
                        { name: 'Timeout Duration', value: timeoutDisplay },
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
                ...(timeoutMs !== null
                    ? [
                        { name: 'Timeout Duration', value: timeoutDisplay },
                        { name: 'Timeout Ends', value: `<t:${timeoutTimestamp}:F>` },
                    ]
                    : [])
            )
            .setTimestamp();

        try {
            // Send the warning DM
            await target.send({ embeds: [warnEmbed] });
        } catch (dmError) {
            console.warn(
                `Could not DM ${target.tag}:`,
                dmError.message
            );
        }

        if (timeoutMs !== null) {
            await member.timeout(
                timeoutMs,
                `Warned by ${interaction.user.tag}: ${reason}`
            );
        }

        // Log the warning in the moderation channel
        const modChannelName = Config.moderation.channel_name;
        const modChannel = guild.channels.cache.find(
            channel => channel.name === modChannelName
        );

        if (modChannel) {
            await modChannel.send({ embeds: [modLogEmbed] });
        } else {
            console.warn(`Moderation channel "${modChannelName}" not found.`);
        }

        await interaction.editReply({
            content: `Successfully warned ${target.tag}. ${timeoutInfo}`,
        });
    } catch (err) {
        console.error('Error during warn command execution:', err);

        await interaction.editReply({
            content: `Failed to warn ${target.tag}. They might not be in the server, I may not have sufficient permissions, or another error occurred.`,
        });
    }
}
