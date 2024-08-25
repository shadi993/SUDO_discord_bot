const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Do the ping yo'),
    async execute(interaction) {
        console.log('Ping command');
        await interaction.reply('Pong!');
    },
};
