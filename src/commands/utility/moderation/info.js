import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Config } from '../../../core/config.mjs';

export const data = new SlashCommandBuilder()
        .setName('info')
        .setDescription('Inform a user and send them a DM.')
        .addUserOption(option => option.setName('target').setDescription('The user to get informed').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the info').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

    export async function execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');

        const warnEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('❗️ Information!')
            .addFields(
                { name: 'Info', value: reason },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Guild', value: `${interaction.guild.name}`, inline: true },
            )
            .setTimestamp();


        // Embed for moderation log
        const modLogEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('❗️ User Informed')
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { name: 'User', value: `<@${target.id}> ID: ${target.id}`, inline: true },
                { name: 'Reason', value: reason },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true })
        .setTimestamp();

        try {
            await target.send({ embeds: [warnEmbed] });

            await interaction.reply({ content: `Successfully Informed ${target.tag}.`, ephemeral: true });
        } catch (err) {
            console.error('Error sending Info message to the user: ', err);

            await interaction.reply({ content: `Failed to send a information to ${target.tag}. They might have DMs disabled.`, ephemeral: true });
        }

        const modChannelName = Config.moderation.channel_name; 
        const modChannel = interaction.guild.channels.cache.find(channel => channel.name === modChannelName);
        if (modChannel) {
            await modChannel.send({ embeds: [modLogEmbed] });
        } else {
            console.warn(`Moderation channel "${modChannelName}" not found.`);
        }
    };