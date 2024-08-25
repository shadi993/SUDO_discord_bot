import { config } from 'dotenv';
import { InitCommands } from './commands/init.mjs';
import {Client, GatewayIntentBits, Events, Collection} from 'discord.js';

config();

const client = new Client({ intents:
    GatewayIntentBits.Guilds |
    GatewayIntentBits.GuildMembers |
    GatewayIntentBits.GuildMessages |
    GatewayIntentBits.GuildMessageReactions |
    GatewayIntentBits.GuildMembers |
    GatewayIntentBits.GuildEmojisAndStickers |
    GatewayIntentBits.DirectMessages |
    GatewayIntentBits.DirectMessageReactions |
    GatewayIntentBits.MessageContent
});

client.commands = new Collection();
InitCommands(client.commands);

client.once(Events.ClientReady,() => {
    console.log(`${client.user.username} has logged in.`);
});

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

client.on(Events.MessageCreate, async (message) => {
    console.log(`[${message.author.tag}]: ${message.content}`);
    if (message.content === 'hello'){
        message.reply('Hello');
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
