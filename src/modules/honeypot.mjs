import { CreateLogger } from '../core/logger.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import * as fs from 'node:fs';

export const HoneypotModule = class {
    #logger;
    #config;
    #discordChannels;
    #logChannel;

    constructor() {
        this.#logger = CreateLogger('HoneypotModule');
        this.#config = JSON.parse(fs.readFileSync('honeypot.json'));

        if (!this.#config.enabled) {
            this.#logger.log('info', 'Honeypot is disabled.');
        }
    }

    async onDiscordReady(guild, channels) {
    if (!this.#config.enabled) return;

    this.#discordChannels = channels;

    const channel = this.#discordChannels.find(
        c => c.name === this.#config.channel_name
    );

    this.#logChannel = this.#discordChannels.find(
        c => c.name === this.#config.log_channel_name
    );

    if (!channel) {
        this.#logger.log('error', `Channel not found: ${this.#config.channel_name}`);
        return;
    }

    if (!this.#logChannel) {
        this.#logger.log('warning', `Log channel not found: ${this.#config.log_channel_name}`);
    }

    const messages = await channel.messages.fetch({ limit: 20 });

    const existingMessage = messages.find(msg =>
        msg.author.id === process.env.DISCORD_CLIENT_ID &&
        msg.embeds.length > 0 &&
        msg.embeds[0].title === this.#config.title
    );

        const embed = new EmbedBuilder()
            .setTitle(this.#config.title)
            .setDescription(this.#config.description)
            .setColor(0xff0000);

        const button = new ButtonBuilder()
            .setCustomId('honeypot_trigger')
            .setLabel(this.#config.button_text)
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(button);

            const payload = {
        embeds: [embed],
        components: [row]
    };

        if (existingMessage) {
            this.#logger.log('info', 'Honeypot message found. Updating...');
            await existingMessage.edit(payload);
        } else {
            this.#logger.log('info', 'Honeypot message not found. Creating...');
            await channel.send(payload);
    }
    }

    async onDiscordInteraction(interaction) {
        if (!interaction.isButton()) return;
        if (interaction.customId !== 'honeypot_trigger') return;

        const member = interaction.member;

        this.#logger.log('warn', `Honeypot triggered by ${interaction.user.tag}`);

        // send log
        if (this.#logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle(' Honeypot Triggered')
                .setColor('#ED4245')
                .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: '\u200B', value: `<@${interaction.user.id}> has Triggered the honeypot.` },
                    { name: 'Action', value: this.#config.punishment, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'SUDO' });

            try {
                await this.#logChannel.send({ embeds: [logEmbed] });
            } catch (err) {
                this.#logger.log('error', `Failed to send log message: ${err.message}`);
            }
        }

        // Apply punishment
        try {
            switch (this.#config.punishment) {
                case 'kick':
                    await member.kick('Triggered honeypot');
                    break;
                case 'ban':
                    await member.ban({ reason: 'Triggered honeypot' });
                    break;
                default:
                    this.#logger.log('error', 'Unknown punishment type.');
                    return;
            }
        } catch (err) {
            this.#logger.log('error', `Failed to punish user: ${err.message}`);
        }

    }
};