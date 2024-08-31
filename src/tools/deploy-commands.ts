import { config } from 'dotenv';
config();

import { REST, Routes } from 'discord.js';

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

const commands = [];
const currentDirectory = path.dirname(url.fileURLToPath(import.meta.url));
const foldersPath = path.join(currentDirectory, '..', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

const DISCORD_BOT_TOKEN: string|undefined = process.env.DISCORD_BOT_TOKEN
const DISCORD_CLIENT_ID: string|undefined = process.env.DISCORD_CLIENT_ID
const DISCORD_GUILD_ID: string|undefined = process.env.DISCORD_GUILD_ID


if(!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
	throw new Error('Correct Discord bot Config not in the .env file. Please check README.MD');
}

for (const folder of commandFolders) {
	if (folder.endsWith('.ts')) continue;

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


const rest = new REST().setToken(DISCORD_BOT_TOKEN);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		await rest.put(
			Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
			{ body: commands },
		)
		.then((response) => {
			const responsEntities = response as PutResponse[];
			console.log(`Successfully reloaded ${responsEntities.length} application (/) commands.`);
			for( let entity of responsEntities) {
				console.log(`  * ${entity.name}`)
			}
		});

	} catch (error) {
		console.error(error);
	}
})();


interface PutResponse {
	id:string;
	application_id:string;
	version:string;
	type:number;
	name: string;
	description: string;
	guild_id: number;
	nsfw:false
}