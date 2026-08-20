import { CreateLogger } from '../core/logger.mjs';
import { DiscordClient } from "../core/discord-client.mjs";
import { Events, EmbedBuilder } from 'discord.js';
import { Config } from "../core/config.mjs";

export const AutoKick = class {
    #logger

    constructor() {
        this.#logger = CreateLogger('AutoKick');
    }

    async onDiscordReady() {
        if (Config.autokick.enabled !== true) {
            this.#logger.log('info', 'AutoKick module is disabled.');
            return;
        }
        this.#logger.log('info', 'AutoKick module is ready.');

        DiscordClient.on(Events.GuildMemberAdd, async (member) => {
            await this.onMemberJoin(member);
        });
    }

    async onMemberJoin(member) {
        const accountAgeLimitDays = Config.autokick.account_age_limit;
        const currentDate = new Date();
        const accountCreationDate = member.user.createdAt;
        const accountAgeMilliseconds = currentDate - accountCreationDate;
        const accountAgeDays = Math.floor(accountAgeMilliseconds / (1000 * 60 * 60 * 24));

        if (accountAgeDays < accountAgeLimitDays) {
            this.#logger.log('info', `Kicking ${member.user.tag}, account age: ${accountAgeDays} days (Limit: ${accountAgeLimitDays} days)`);

            const dmEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('You have been kicked')
                .setDescription(
                    `Hello ${member.user.username},\n` +
                    `Your account was created only **${accountAgeDays} days ago**, which is below our server's minimum requirement of **${accountAgeLimitDays} days**.`
                )
                .setTimestamp()
                .setFooter({ text: 'SUDO Bot' });

            // Send DM
            try {
                await member.send({ embeds: [dmEmbed] });
            } catch (error) {
                this.#logger.log('error', `Could not send DM to ${member.user.tag}: ${error.message}`);
            }

            // kick member
            try {
                await member.kick('Account is too new.');
                this.#logger.log('info', `Successfully kicked ${member.user.tag}.`);
            } catch (error) {
                this.#logger.log('error', `Failed to kick ${member.user.tag}: ${error.message}`);
                return; 
            }

            // AutoKick info
            if (Config.autokick.info_enbaled !== true){
                return;
            }
            try {
                const notifyChannel = member.guild.channels.cache.find(
                    channel =>
                        channel.name === Config.autokick.notify_channel
                );

                if (!notifyChannel || !notifyChannel.isTextBased()) {
                    this.#logger.log(
                        'error',
                        `AutoKick notification channel "${Config.autokick.notify_channel}" not found or is not a text channel.`
                    );
                    return;
                }
                const autoKickEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setAuthor({
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL()
                    })
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields({
                        name: '\u200B',
                        value: `<@${member.user.id}> triggered auto kick.`
                    })
                    .setTimestamp()
                    .setFooter({
                        text: 'SUDO'
                    });

                await notifyChannel.send({
                    embeds: [autoKickEmbed]
                });

                this.#logger.log(
                    'info',
                    `AutoKick notification sent to #${notifyChannel.name}.`
                );
            } catch (error) {
                this.#logger.log(
                    'error',
                    `Failed to send AutoKick notification: ${error.message}`
                );
            }
        } else {
            this.#logger.log('info', `${member.user.tag} passed the account age check: ${accountAgeDays} days.`);
        }
    }
};