import {SlashCommandBuilder,PermissionFlagsBits,EmbedBuilder} from 'discord.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { Settings } from '../../../core/settings.config.js';

export const data = new SlashCommandBuilder()
    .setName('db')
    .setDescription('Manage the bot database')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // /db export
    .addSubcommand(subcommand =>
        subcommand
            .setName('export')
            .setDescription('Export the database and post it in the current channel')
    )
    // /db import
    .addSubcommand(subcommand =>
        subcommand
            .setName('import')
            .setDescription('Import and replace the database file')
            .addAttachmentOption(option =>
                option
                    .setName('file')
                    .setDescription('SQLite database file')
                    .setRequired(true)
            )
    )
    // /db restore
    .addSubcommand(subcommand =>
        subcommand
            .setName('restore')
            .setDescription('Restore the database from a backup file')
            .addStringOption(option =>
                option
                    .setName('backup')
                    .setDescription('Choose the backup timestamp to restore')
                    .setRequired(true)
            )
    )
    // /db list
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('List all database backups available for restore')
    );

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        // Check administrator permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({
                content: '❌ You need Administrator permissions to use this command.'
            });
        }

        // Get selected subcommand
        const subcommand = interaction.options.getSubcommand();

        // Get database configuration
        const connectionString = Settings.database.connection_string;

        if (!connectionString.startsWith('sqlite:')) {
            return interaction.editReply({
                content: '❌ This command only supports SQLite databases.'
            });
        }

        const dbPath = connectionString.replace('sqlite:', '');
        const absolutePath = path.resolve(dbPath);

        // /db export
        if (subcommand === 'export') {
            if (!fs.existsSync(absolutePath)) {
                return interaction.editReply({
                    content: '❌ Database file not found.'
                });
            }

            const now = new Date();
            const timestamp = now
                .toISOString()
                .replace('T', ' ')
                .split('.')[0];

            await interaction.channel.send({
                content: `Database backup ${timestamp}`,
                files: [
                    {
                        attachment: absolutePath,
                        name: path.basename(absolutePath)
                    }
                ]
            });

            return interaction.editReply({
                content: '✅ Database exported successfully in this channel.'
            });
        }

        // /db import
        if (subcommand === 'import') {
            const attachment = interaction.options.getAttachment('file');

            if (!attachment.name.toLowerCase().endsWith('.sqlite')) {
                return interaction.editReply({
                    content: '❌ Please upload a valid .sqlite file.'
                });
            }

            // Backup the current database
            const timestamp = Date.now();
            const backupPath = `${absolutePath}.${timestamp}.backup`;

            if (fs.existsSync(absolutePath)) {
                fs.copyFileSync(absolutePath, backupPath);
            }

            // Download uploaded database
            const fileStream = fs.createWriteStream(absolutePath);

            https.get(attachment.url, response => {
                response.pipe(fileStream);

                fileStream.on('finish', async () => {
                    fileStream.close();

                    await interaction.editReply({
                        content: '✅ Database successfully replaced.'
                    });
                });
            }).on('error', async err => {
                console.error('Database download error:', err);

                // Remove incomplete database if it exists
                if (fs.existsSync(absolutePath)) {
                    try {
                        fs.unlinkSync(absolutePath);
                    } catch (cleanupError) {
                        console.error(
                            'Failed to remove incomplete database:',
                            cleanupError
                        );
                    }
                }

                // Restore previous database from backup
                if (fs.existsSync(backupPath)) {
                    try {
                        fs.copyFileSync(backupPath, absolutePath);
                    } catch (restoreError) {
                        console.error(
                            'Failed to restore previous database:',
                            restoreError
                        );
                    }
                }

                await interaction.editReply({
                    content: '❌ Failed to download or replace database.'
                });
            });

            return;
        }

        // /db restore
        if (subcommand === 'restore') {
            const folder = path.dirname(absolutePath);
            const databaseName = path.basename(absolutePath);

            // List backup files
            const backups = fs.readdirSync(folder)
                .filter(file =>
                    file.startsWith(`${databaseName}.`) &&
                    file.endsWith('.backup')
                )
                .sort();

            if (backups.length === 0) {
                return interaction.editReply({
                    content: '❌ No backup files found.'
                });
            }

            const backupOption = interaction.options.getString('backup');

            // Find matching backup
            const backupFile = backups.find(file =>
                file.includes(backupOption)
            );

            if (!backupFile) {
                return interaction.editReply({
                    content:
                        `❌ Backup not found.\n\nAvailable backups:\n` +
                        backups.join('\n')
                });
            }

            const backupPath = path.join(folder, backupFile);

            // Backup the current database before restoring
            const tempBackup = `${absolutePath}.pre-restore`;

            if (fs.existsSync(absolutePath)) {
                fs.copyFileSync(absolutePath, tempBackup);
            }

            // Restore selected backup
            fs.copyFileSync(backupPath, absolutePath);

            return interaction.editReply({
                content:
                    `✅ Database restored from \`${backupFile}\`.\n` +
                    `🛟 Previous DB saved as \`.pre-restore\``
            });
        }

        // /db list
        if (subcommand === 'list') {
            const folder = path.dirname(absolutePath);
            const databaseName = path.basename(absolutePath);

            // List all backup files
            const backups = fs.readdirSync(folder)
                .filter(file =>
                    file.startsWith(`${databaseName}.`) &&
                    file.endsWith('.backup')
                )
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
                .setDescription(
                    backups.map(backup => `\`${backup}\``).join('\n')
                )
                .setTimestamp();

            return interaction.editReply({
                embeds: [embed]
            });
        }

    } catch (err) {
        console.error('DB command error:', err);

        return interaction.editReply({
            content: '❌ Failed to execute database command.'
        });
    }
}
