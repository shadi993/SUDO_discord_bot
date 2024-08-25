import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

import { Events, Collection } from 'discord.js';

export const InitCommands = async (client) => {
    console.log('Initializing commands...');

    client.commands = new Collection();

    const currentDirectory = path.dirname(url.fileURLToPath(import.meta.url));
    const commandFolders = fs.readdirSync(currentDirectory);

    for (const folder of commandFolders) {
        if (folder === 'init.mjs') continue;

        const commandsPath = path.join(currentDirectory, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = await import(filePath);

            if ('data' in command && 'execute' in command) {
                console.log(`Registering command ${command.data.name}`);
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    });

    console.log('Finished initializing commands.');
}
