import { SlashCommandBuilder } from 'discord.js';
import { PostCountDboEntity } from '../../core/database.mjs'; 
import { Config } from '../../core/config.mjs'; 

export const data = new SlashCommandBuilder()
    .setName('slot')
    .setDescription('Play the slot game!')
    .addIntegerOption(option =>
        option.setName('bet')
        .setDescription('How many points do you want to bet?')
        .setRequired(true)
    );


export async function execute(interaction) {
    
    if (interaction.channel.name !== Config.rank.channel_allowed) {
        return interaction.reply({ content: `You can only use this command in the allowed channel: ${Config.rank.channel_allowed}`, ephemeral: true });
    }

    const userId = interaction.user.id;
    const bet = interaction.options.getInteger('bet');

    let dbResult = await PostCountDboEntity.findOne({ where: { discord_id: userId } });

    if (!dbResult || dbResult.points < bet) {
        return interaction.reply({ content: `You don't have enough points to place this bet!`, ephemeral: true });
    }

    const slotItems = ['🍒', '🍋', '🍉', '⭐', '🍀'];
    const result = [
        slotItems[Math.floor(Math.random() * slotItems.length)],
        slotItems[Math.floor(Math.random() * slotItems.length)],
        slotItems[Math.floor(Math.random() * slotItems.length)],
    ];

    let winnings = 0;
    if (result[0] === result[1] && result[1] === result[2]) {
        winnings = bet * 5; // If all 3 match, user wins 5x the bet
    } else if (result[0] === result[1] || result[1] === result[2]) {
        winnings = bet * 2; // If 2 match, user wins 2x the bet
    }

    dbResult.points += winnings - bet;
    await dbResult.save();

    await interaction.reply({
        content: `🎰 | ${result.join(' | ')}\nYou ${winnings > 0 ? `won ${winnings} points!` : 'lost your bet.'} You now have ${dbResult.points} points.`,
        ephemeral: true
    });
}