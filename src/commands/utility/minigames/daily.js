import { SlashCommandBuilder } from 'discord.js';
import { PostCountDboEntity } from '../../../core/database.mjs';
import { Config } from '../../../core/config.mjs';

export const data = new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily points.');

export async function execute(interaction) {
    const targetChannelName = Config.rank.channel_allowed;
    const targetChannel = interaction.guild.channels.cache.find(channel => channel.name === targetChannelName);

    if (!targetChannel) {
        await interaction.reply({ content: `Channel **${targetChannelName}** not found.`, ephemeral: true });
        return;
    }

    if (interaction.channel.id !== targetChannel.id) {
        await interaction.reply({ content: `You can only use this command in **${targetChannelName}** channel.`, ephemeral: true });
        return;
    }

    const userId = interaction.user.id;
    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); // Midnight UTC today.

    try {
        let userInfo = await PostCountDboEntity.findOne({ where: { discord_id: userId } });

        if (!userInfo) {

            userInfo = await PostCountDboEntity.create({
                discord_id: userId,
                points: 100,
                last_daily_claim: nowUTC,
            });
            await interaction.reply({ content: `🎉 You've claimed your daily 100 points!`, ephemeral: true });
            return;
        }

        const lastClaimDate = userInfo.last_daily_claim ? new Date(userInfo.last_daily_claim) : null;
        const nextClaimDate = new Date(lastClaimDate || 0);
        nextClaimDate.setUTCDate(nextClaimDate.getUTCDate() + 1); 

        if (nowUTC < nextClaimDate) {
            const hoursLeft = Math.ceil((nextClaimDate - now) / (1000 * 60 * 60));
            await interaction.reply({
                content: `🕒 You've already claimed your daily points. Come back in **${hoursLeft} hour(s)**.`,
                ephemeral: true,
            });
            return;
        }

        const updatedPoints = (userInfo.points || 0) + 100;
        await PostCountDboEntity.update(
            { points: updatedPoints, last_daily_claim: nowUTC },
            { where: { discord_id: userId } }
        );

        await interaction.reply({ content: `🎉 You've claimed your daily 100 points! Your total is now ${updatedPoints}.`, ephemeral: true });
    } catch (error) {
        console.error('Error with /daily command:', error);
        await interaction.reply({
            content: `⚠️ An error occurred while claiming daily points. Please try again later.`,
            ephemeral: true,
        });
    }
}
