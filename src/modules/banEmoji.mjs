import { EmbedBuilder } from 'discord.js';
import * as fs from 'node:fs';
import { CreateLogger } from '../core/logger.mjs';
import { Config } from '../core/config.mjs';

export const BanEmoji = class {
    #logger;
    #config;
    #logChannel;

    constructor() {
        this.#logger = CreateLogger('BanEmoji');

        // Load the main config.json
        const config = JSON.parse(
            fs.readFileSync('config.json', 'utf8')
        );

        // Get the banned emoji configuration
        this.#config = config.ban_emoji;

        if (!this.#config) {
            this.#logger.log(
                'error',
                'Missing "ban_emoji" configuration in config.json.'
            );

            throw new Error(
                'Missing "ban_emoji" configuration in config.json.'
            );
        }
    }

    async onDiscordReady(guild, channels) {
        this.#logger.log(
            'info',
            'Ban Emoji module is ready.'
        );

        if (!this.#config.enabled) {
            this.#logger.log(
                'info',
                'Ban Emoji module is disabled in config.json.'
            );

            return;
        }

        this.#logger.log(
            'info',
            `Ban Emoji config: ${JSON.stringify(this.#config)}`
        );

        this.#logger.log(
            'info',
            `Loaded ${this.#config.emojis?.length || 0} banned emojis.`
        );

        // Find the configured moderation log channel.
        if (this.#config.log) {
            if (!this.#config.log_channel) {
                this.#logger.log(
                    'warning',
                    'Emoji ban logging is enabled but no "log_channel" is configured.'
                );

                return;
            }

            this.#logChannel = channels.find(
                (channel) =>
                    channel.id === this.#config.log_channel || channel.name === this.#config.log_channel
            );

            if (!this.#logChannel) {
                this.#logger.log(
                    'error',
                    `Emoji ban log channel not found: ${this.#config.log_channel}`
                );

                return;
            }

            this.#logger.log(
                'info',
                `Emoji ban log channel found: ${this.#logChannel.name}`
            );
        }
    }

    async onConfigUpdate(guild, channels) {
        this.#config = Config.ban_emoji;
        return this.onDiscordReady(guild, channels);
    }

    async onDiscordMessage(message) {
        if (!this.#config.enabled) {
            return;
        }

        if (!message.guild) {
            return;
        }

        if (message.author?.bot) {
            return;
        }

        try {
            const bannedEmojis =
                this.#findBannedEmojis(message.content);

            if (bannedEmojis.length === 0) {
                return;
            }

            const emojiList = [
                ...new Set(
                    bannedEmojis.map(
                        (emoji) => emoji.display
                    )
                ),
            ];

            await message.delete();

            this.#logger.log(
                'warn',
                `Deleted message ${message.id} from ${message.author.tag} (${message.author.id}) because it contained banned emoji${emojiList.length > 1 ? 's' : ''}: ${emojiList.join(', ')}.`
            );

            await this.#sendLog(
                message.author,
                emojiList,
                'Message Deleted',
                message.channel.name
            );

            await this.#notifyUser(
                message.author,
                emojiList,
                'message'
            );
        } catch (error) {
            this.#logger.log(
                'error',
                `Failed to delete message ${message.id} containing banned emoji: ${error.message}`
            );
        }
    }

    async onDiscordMessageReactionAdd(reaction, user) {
        if (!this.#config.enabled) {
            return;
        }

        if (user.bot) {
            return;
        }

        try {
            // Fetch partial reaction if necessary.
            if (reaction.partial) {
                await reaction.fetch();
            }

            const emoji = reaction.emoji;

            if (!this.#isBannedEmoji(emoji)) {
                return;
            }

            const emojiDisplay =
                emoji.toString();

            // Remove only the user's banned reaction.
            await reaction.users.remove(
                user.id
            );

            this.#logger.log(
                'warn',
                `Removed banned emoji reaction ${emojiDisplay} from ${user.tag} (${user.id}).`
            );

            await this.#sendLog(
                user,
                [emojiDisplay],
                'Reaction Removed',
                reaction.message?.channel?.name
            );

            await this.#notifyUser(
                user,
                [emojiDisplay],
                'reaction'
            );
        } catch (error) {
            this.#logger.log(
                'error',
                `Failed to remove banned emoji reaction: ${error.message}`
            );
        }
    }

    async #sendLog(
        user,
        emojiList,
        action,
        channelName
    ) {
        if (!this.#config.log) {
            return;
        }

        if (!this.#logChannel) {
            return;
        }

        try {
            const emojiText =
                emojiList.join(' ');

            const logEmbed = new EmbedBuilder()
                .setTitle('Emoji Ban Triggered')
                .setColor('#ED4245')
                .setAuthor({
                    name: user.tag,
                    iconURL: user.displayAvatarURL(),
                })
                .setThumbnail(
                    user.displayAvatarURL()
                )
                .addFields(
                    {name: '\u200B',value:`<@${user.id}> has triggered the emoji ban.`,},
                    {name: 'Emoji',value: emojiText,inline: true,},
                    {name: 'Action',value: action,inline: true,},
                    {name: 'Channel',value:channelName? `#${channelName}`: 'Unknown',inline: true,}
                )
                .setTimestamp()
                .setFooter({
                    text: 'SUDO',
                });

            await this.#logChannel.send({
                embeds: [logEmbed],
            });
        } catch (error) {
            this.#logger.log(
                'error',
                `Failed to send emoji ban log message: ${error.message}`
            );
        }
    }

    async #notifyUser(
        user,
        emojiList,
        type
    ) {
        try {
            if (!emojiList || emojiList.length === 0) {
                return;
            }

            const emojiText =
                emojiList.join(' ');

            let message;

            if (type === 'message') {
                message =
                    `❌ Your message was removed because it contained a banned emoji: ${emojiText}`;
            } else {
                message =
                    `❌ Your reaction ${emojiText} was removed because that emoji is banned on this server.`;
            }

            await user.send({
                content: message,
            });

            this.#logger.log(
                'debug',
                `Sent banned emoji notification to ${user.tag} (${user.id}).`
            );
        } catch (error) {
            // User may have DMs disabled.
            this.#logger.log(
                'debug',
                `Could not send banned emoji notification to ${user.id}: ${error.message}`
            );
        }
    }

    #findBannedEmojis(content) {
        const matches = [];

        if (!content) {
            return matches;
        }

        for (
            const configuredEmoji of
            this.#config.emojis || []
        ) {
            const emoji =
                String(configuredEmoji).trim();

            if (!emoji) {
                continue;
            }

            // Custom Discord emoji ID
            if (/^\d+$/.test(emoji)) {
                const customEmojiRegex =
                    new RegExp(
                        `<a?:[^:>]+:${emoji}>`,
                        'g'
                    );

                const customMatches =
                    content.match(
                        customEmojiRegex
                    );

                if (customMatches) {
                    for (
                        const match of
                        customMatches
                    ) {
                        matches.push({
                            match: match,
                            configuredEmoji: emoji,
                            display: match,
                        });
                    }
                }

                continue;
            }

            // Custom Discord emoji name
            if (
                emoji.startsWith(':') &&
                emoji.endsWith(':') &&
                emoji.length > 2
            ) {
                const emojiName =
                    emoji.slice(1, -1);

                const customEmojiRegex =
                    new RegExp(
                        `<a?:${this.#escapeRegex(emojiName)}:\\d+>`,
                        'g'
                    );

                const customMatches =
                    content.match(
                        customEmojiRegex
                    );

                if (customMatches) {
                    for (
                        const match of
                        customMatches
                    ) {
                        matches.push({
                            match: match,
                            configuredEmoji: emoji,
                            display: emoji,
                        });
                    }
                }

                continue;
            }

            // Unicode emoji
            if (content.includes(emoji)) {
                matches.push({
                    match: emoji,
                    configuredEmoji: emoji,
                    display: emoji,
                });
            }
        }

        return matches;
    }

    #isBannedEmoji(emoji) {
        if (!emoji) {
            return false;
        }

        for (
            const configuredEmoji of
            this.#config.emojis || []
        ) {
            const bannedEmoji =
                String(configuredEmoji).trim();

            if (!bannedEmoji) {
                continue;
            }

            // Custom Discord emoji ID
            if (/^\d+$/.test(bannedEmoji)) {
                if (emoji.id === bannedEmoji) {
                    return true;
                }

                continue;
            }

            // Custom Discord emoji name
            if (
                bannedEmoji.startsWith(':') &&
                bannedEmoji.endsWith(':') &&
                bannedEmoji.length > 2
            ) {
                const emojiName =
                    bannedEmoji.slice(1, -1);

                if (
                    emoji.id &&
                    emoji.name === emojiName
                ) {
                    return true;
                }

                continue;
            }

            // Unicode emoji
            if (
                !emoji.id &&
                emoji.toString() === bannedEmoji
            ) {
                return true;
            }
        }

        return false;
    }

    #escapeRegex(value) {
        return value.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
        );
    }
};
