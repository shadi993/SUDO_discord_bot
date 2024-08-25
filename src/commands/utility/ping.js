import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Do the ping yo');
export async function execute(interaction) {
    console.log('Ping command');
    await interaction.reply('Pong!');
}
