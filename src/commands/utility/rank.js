import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { PostCountDboEntity } from '../../core/database.mjs';
import { LevelingModule } from '../../modules/leveling.mjs';
import { Config } from '../../core/config.mjs';

export const data = new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show the current rank and XP of a user.')
    .addUserOption(option => option.setName('target').setDescription('The user to view').setRequired(false));

export async function execute(interaction) {
    const targetChannelName = Config.rank.channel_allowed;
    const targetChannel = interaction.guild.channels.cache.find(channel => channel.name === targetChannelName);

    if (!targetChannel) {
        await interaction.reply({ content: `Channel **${targetChannelName}** not found.`, ephemeral: true });
        return;
    }

    // Check if the command is executed in the allowed channel
    if (interaction.channel.id !== targetChannel.id) {
        await interaction.reply({ content: `You can only use this command in **${targetChannelName}** channel.`, ephemeral: true });
        return;
    }

    const target = interaction.options.getUser('target') || interaction.user;

    // Fetch user info from the database
    const userInfo = await PostCountDboEntity.findOne({ where: { discord_id: target.id } });

    if (!userInfo) {
        await interaction.reply({ content: `No rank data found for ${target.tag}.`, ephemeral: true });
        return;
    }

    // Calculate the level and next level's XP
    const xp = userInfo.xp;
    const currentLevel = LevelingModule.calculateLevel(xp); 
    const nextLevelXP = LevelingModule.calculateNextLevelXP(currentLevel);

    // Create rank embed
    const rankEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`📊 Rank for ${target.username}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
            { name: 'Current XP', value: xp.toString(), inline: true },
            { name: 'Level', value: currentLevel.toString(), inline: true },
            { name: 'Next Level XP', value: nextLevelXP.toString(), inline: true }
        )
        .setTimestamp();

    // Reply with the rank embed
    await interaction.reply({ embeds: [rankEmbed] });
}