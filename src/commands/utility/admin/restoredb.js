import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { Config } from '../../../core/config.mjs';

export const data = new SlashCommandBuilder()
    .setName('restoredb')
    .setDescription('Restore the database from a backup file')
    .addStringOption(option =>
        option.setName('backup')
            .setDescription('Choose the backup timestamp to restore')
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

        const connectionString = Config.database.connection_string;
        if (!connectionString.startsWith('sqlite:')) {
            return interaction.editReply({
                content: '❌ This command only supports SQLite databases.'
            });
        }

        const dbPath = connectionString.replace('sqlite:', '');
        const absolutePath = path.resolve(dbPath);

        // list backup files
        const folder = path.dirname(absolutePath);
        const backups = fs.readdirSync(folder)
            .filter(f => f.startsWith(path.basename(absolutePath) + '.') && f.endsWith('.backup'))
            .sort(); 

        if (backups.length === 0) {
            return interaction.editReply({
                content: '❌ No backup files found.'
            });
        }

        const backupOption = interaction.options.getString('backup');

        // find matching backup
        const backupFile = backups.find(f => f.includes(backupOption));
        if (!backupFile) {
            return interaction.editReply({
                content: `❌ Backup not found. Available backups:\n${backups.join('\n')}`
            });
        }

        const backupPath = path.join(folder, backupFile);

        //backup the current one being used
        const tempBackup = absolutePath + '.pre-restore';
        if (fs.existsSync(absolutePath)) {
            fs.copyFileSync(absolutePath, tempBackup);
        }

        // restore
        fs.copyFileSync(backupPath, absolutePath);

        await interaction.editReply({
            content: `✅ Database restored from \`${backupFile}\`.\n🛟 Previous DB saved as \`.pre-restore\``
        });

    } catch (err) {
        console.error(err);
        await interaction.editReply({
            content: '❌ Failed to restore database.'
        });
    }
}