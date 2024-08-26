import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { Logger } from '../core/logger.mjs';

import { Events, Collection } from 'discord.js';

export const InitCommands = async (client) => {
    Logger.log('info', 'Initializing commands');

    client.commands = new Collection();

    const currentDirectory = path.dirname(url.fileURLToPath(import.meta.url));
    const commandFolders = fs.readdirSync(currentDirectory);

    for (const folder of commandFolders) {
        if (folder === 'init.mjs') continue;

        const commandsPath = path.join(currentDirectory, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = await import("file://" + filePath);

            if ('data' in command && 'execute' in command) {
                Logger.log('info', `Registering command ${command.data.name}`);
                client.commands.set(command.data.name, command);
            } else {
                Logger.log('warn', `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            Logger.log('error', `No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            Logger.log('error', `There was an error while executing ${interaction.commandName}: ${error}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    });

    Logger.log('info', 'Finished initializing commands.');
}
