import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { PostCountDboEntity } from '../../../core/database.mjs';
import { Config } from '../../../core/config.mjs';

export const data = new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Try your luck with the slot machine!')
    .addIntegerOption(option =>
        option
            .setName('bet')
            .setDescription('The amount of points to bet (minimum 10).')
            .setRequired(true)
    );

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

    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet');

    if (bet < 10) {
        await interaction.reply({ content: `The minimum bet is 10 points.`, ephemeral: true });
        return;
    }

    const userInfo = await PostCountDboEntity.findOne({ where: { discord_id: userId } });

    if (!userInfo || userInfo.points < bet) {
        await interaction.reply({ content: `You don't have enough points to place this bet.`, ephemeral: true });
        return;
    }

    userInfo.points -= bet;

    const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'];
    const slots = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
    ];

    const isWin = slots[0] === slots[1] && slots[1] === slots[2];
    const winnings = isWin ? bet * 3 : 0; 

    if (isWin) {
        userInfo.points += winnings;
    }

    await userInfo.save();

    const embed = new EmbedBuilder()
        .setColor(isWin ? '#00FF00' : '#FF0000')
        .setTitle('🎰 Slot Machine 🎰')
        .setDescription(slots.join(' | '))
        .addFields(
            { name: 'Bet', value: bet.toString(), inline: true },
            { name: isWin ? 'Winnings' : 'Loss', value: isWin ? `+${winnings}` : `-${bet}`, inline: true },
            { name: 'Your Points', value: userInfo.points.toString(), inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
