import { config } from 'dotenv';
config();

import { REST, Routes } from 'discord.js';

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

const commands = [];
const currentDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const foldersPath = path.join(currentDirectory, '..', 'commands');
const commandFolders = fs.readdirSync(foldersPath,{recursive:true});

for (const folder of commandFolders) {
	if (folder.endsWith('.mjs') || folder.endsWith('.js')) continue;

	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import("file://" + filePath);

		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const data = await rest.put(
			Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();
