import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { Config } from '../../../core/config.mjs';

export const data = new SlashCommandBuilder()
    .setName('importdb')
    .setDescription('Import and replace the database file')
    .addAttachmentOption(option =>
        option.setName('file')
            .setDescription('SQLite database file')
            .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({
                content: '❌ You need Administrator permissions to use this command.'
            });
        }

        const attachment = interaction.options.getAttachment('file');

        if (!attachment.name.endsWith('.sqlite')) {
            return interaction.editReply({
                content: '❌ Please upload a valid .sqlite file.'
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

        // backup old db
        const timestamp= Date.now();
        const backupPath = absolutePath +'.' + timestamp + '.backup';
        if (fs.existsSync(absolutePath)) {
            fs.copyFileSync(absolutePath, backupPath);
        }

        // download uploaded file
        const fileStream = fs.createWriteStream(absolutePath);

        https.get(attachment.url, (response) => {
            response.pipe(fileStream);

        fileStream.on('finish', async () => {
            fileStream.close();

            await interaction.editReply({
                content: '✅ Database successfully replaced.'
            });
        });
        }).on('error', async (err) => {
            console.error(err);

            await interaction.editReply({
                content: '❌ Failed to download or replace database.'
            });
        });

    } catch (err) {
        console.error('Import DB error:', err);

        await interaction.editReply({
            content: '❌ Failed to import database.'
        });
    }
}