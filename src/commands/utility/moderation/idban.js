import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Config } from '../../../core/config.mjs';

export const data = new SlashCommandBuilder()
    .setName('idban')
    .setDescription('Ban a user by their Discord ID, even if they are not in the server.')
    .addStringOption(option => option.setName('id').setDescription('The Discord user ID to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
    if (!Config.moderation.enabled) return interaction.reply({ content: 'Moderation is disabled.', ephemeral: true });
    const userId = interaction.options.getString('id').trim();
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await interaction.deferReply({ ephemeral: true });

    // Basic Discord snowflake validation
    if (!/^\d{17,20}$/.test(userId)) {
        await interaction.editReply({content: 'That is not a valid Discord user ID.'});
        return;
    }

    try {
        // Try to fetch the user so we can display their username/avatar.
        // This works even if they are NOT a member of the server.
        let target;

        try {
            target = await interaction.client.users.fetch(userId);
        } catch {
            await interaction.editReply({
                content: 'I could not find a Discord user with that ID.'
            });
            return;
        }

        const modLogEmbed = new EmbedBuilder()

            .setColor('#FF0000')
            .setTitle('🔨 User Pre-Banned')
            .setThumbnail(target.displayAvatarURL({dynamic: true, size: 128}))
            .addFields(
                {name: 'User',value: `<@${target.id}> ID: ${target.id}`,inline: true},
                {name: 'Reason',value: reason},
                {name: 'Moderator',value: interaction.user.tag,inline: true},
                {name: 'Date',value: `<t:${Math.floor(Date.now() / 1000)}:F>`,inline: true}
            )
            .setTimestamp();

        // Ban the user by ID
        // This works even if the user is not currently in the server
        await interaction.guild.members.ban(userId, {
            reason
        });


        // Find moderation channel
        const modChannelName = Config.moderation.channel_name;

        const modChannel = interaction.guild.channels.cache.find(
            channel => channel.name === modChannelName
        );

        if (modChannel) {

            await modChannel.send({
                embeds: [modLogEmbed]
            });

        } else {

            console.warn(
                `Moderation channel "${modChannelName}" not found.`
            );

        }

        await interaction.editReply({
            content: `✅ Successfully banned ${target.tag} (${target.id}).`
        });


    } catch (err) {

        console.error(
            'Error during ID ban command execution:',
            err
        );

        await interaction.editReply({
            content:
                `Failed to ban ${userId}. ` +
                `The bot may not have permission to ban this user, ` +
                `or the user may be above the bot's highest role.`
        });

    }

}