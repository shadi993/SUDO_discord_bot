import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { PostCountDboEntity } from '../../core/database.mjs';
import { Config } from '../../core/config.mjs';
import { isAllowedChannel } from '../../core/discord-helpers.mjs';

export const data = new SlashCommandBuilder()
    .setName('top')
    .setDescription('Show the top 10 members with the highest level');

export async function execute(interaction) {
    if (!Config.leveling.rank_enabled) return interaction.reply({ content: 'Rank commands are disabled.', ephemeral: true });
    if (Config.leveling.rank_top_channel_enabled) {
        const allowedChannel = Config.leveling.rank_top_channel;
        const targetChannel = interaction.guild.channels.cache.find(channel => channel.id === allowedChannel || channel.name === allowedChannel);

        if (!targetChannel) {
            return interaction.reply({ content: `Channel **${allowedChannel}** not found.`, ephemeral: true });
        }

        if (!isAllowedChannel(interaction.channel, allowedChannel, interaction.guild.channels.cache)) {
            return interaction.reply({ content: `You can only use /rank and /top in **${targetChannel.name}** channel.`, ephemeral: true });
        }
    }

    const topUsers = await PostCountDboEntity.findAll({
        order: [['xp', 'DESC']],
        limit: 10
    });

    if (!topUsers.length) {
        return interaction.reply({ content: 'No users found with XP in the database.', ephemeral: true });
    }

    // Fetch the usernames and format the embed
    const embed = new EmbedBuilder()
        .setTitle('Top 10 Members by Level')
        .setColor('#00FF00')
        .setDescription('📊 Here are the top 10 members with the highest level:')
        .setTimestamp();

    for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const discordId = user.discord_id;

        try {
            const member = await interaction.guild.members.fetch(discordId);
            const username = member.user.username;

            embed.addFields({
                name: `#${i + 1} - ${username}`,
                value: `XP: ${user.xp}`,
                inline: true
            });
        } catch {
            embed.addFields({
                name: `#${i + 1} - Unknown User`,
                value: `XP: ${user.xp}`,
                inline: true
            });
        }
    }

    await interaction.reply({ embeds: [embed] });
}