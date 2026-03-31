import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Config } from '../../../core/config.mjs';

export const data = new SlashCommandBuilder()
    .setName('listbackups')
    .setDescription('List all database backups available for restore')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({
                content: '❌ You need Administrator permissions to use this command.'
            });
        }

        const connectionString = Config.database.connection_string;
        if (!connectionString.startsWith('sqlite:')) {
            return interaction.editReply({
                content: '❌ This command only supports SQLite databases.'
            });
        }

        const dbPath = connectionString.replace('sqlite:', '');
        const absolutePath = path.resolve(dbPath);
        const folder = path.dirname(absolutePath);

        // list all backup files matching the DB name
        const backups = fs.readdirSync(folder)
            .filter(f => f.startsWith(path.basename(absolutePath) + '.') && f.endsWith('.backup'))
            .sort()
            .reverse();

        if (backups.length === 0) {
            return interaction.editReply({
                content: '❌ No backups found.'
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('Database Backups')
            .setColor('#00FF00')
            .setDescription(backups.map(b => `\`${b}\``).join('\n'))
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (err) {
        console.error('List backups error:', err);
        await interaction.editReply({
            content: '❌ Failed to list backups.'
        });
    }
}