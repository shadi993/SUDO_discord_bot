import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Config } from '../../../core/config.mjs';

export const data = new SlashCommandBuilder()
    .setName('exportdb')
    .setDescription('Export the database and post it in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({ content: '❌ You need Administrator permissions to use this command.' });
        }

        // get DB path from config
        const connectionString = Config.database.connection_string;
        if (!connectionString.startsWith('sqlite:')) {
            return interaction.editReply({ content: '❌ This command only supports SQLite databases.' });
        }

        const dbPath = connectionString.replace('sqlite:', '');
        const absolutePath = path.resolve(dbPath);

        if (!fs.existsSync(absolutePath)) {
            return interaction.editReply({ content: '❌ Database file not found.' });
        }

        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').split('.')[0]; 

        await interaction.channel.send({
            content: `Database backup ${timestamp}`,
            files: [
                { attachment: absolutePath, name: path.basename(absolutePath) }
            ]
        });

        await interaction.editReply({
            content: '✅ Database exported successfully in this channel.'
        });

    } catch (err) {
        console.error('Export DB error:', err);
        await interaction.editReply({ content: '❌ Failed to export database.' });
    }
}