import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user and send them a DM.')
        .addUserOption(option => option.setName('target').setDescription('The user to warn').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the warning').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

    export async function execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');

        // Create the Info embed
        const warnEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('⚠️ You have been warned!')
            .addFields(
                { name: 'Reason', value: reason },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Guild', value: `${interaction.guild.name}`, inline: true },
            )
            .setTimestamp();

        try {
            // Send the embed to the user's DM
            await target.send({ embeds: [warnEmbed] });

            await interaction.reply({ content: `Successfully warned ${target.tag}.`, ephemeral: true });
        } catch (err) {
            console.error('Error sending warning message to the user: ', err);

            await interaction.reply({ content: `Failed to send a warning to ${target.tag}. They might have DMs disabled.`, ephemeral: true });
        }
    };