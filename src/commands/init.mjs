import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

export const InitCommands = async (commands) => {
    console.log('Initializing commands...');

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
                commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    console.log('Finished initializing commands.');
}
