import {ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,} from 'discord.js';
import * as fs from 'node:fs';
import { CreateLogger } from '../core/logger.mjs';
import { AgeVerificationDboEntity } from '../core/database.mjs';
import { Config } from '../core/config.mjs';

export const DobCheck = class {
    #logger;
    #config;
    #discordChannels;
    #discordGuild;

    constructor() {
        this.#logger = CreateLogger('DobCheck');

        // Load the main config.json
        const config = JSON.parse(
            fs.readFileSync('config.json', 'utf8')
        );

        // Get the DOB verification configuration
        this.#config = config.dob_check;

        if (!this.#config) {
            this.#logger.log(
                'error',
                'Missing "dob_check" configuration in config.json.'
            );

            throw new Error(
                'Missing "dob_check" configuration in config.json.'
            );
        }
    }

    async onDiscordReady(guild, channels) {
        this.#logger.log('info', 'DOB Check module is ready.');
        if (!this.#config.enabled) {
        this.#logger.log('info','DOB Check module is disabled in config.json.');
        return;
        }

        this.#logger.log('info',`DOB config: ${JSON.stringify(this.#config)}`);
        this.#logger.log('info',`Available channels: ${channels.map(ch => ch.name).join(', ')}`);

        this.#discordGuild = guild;
        this.#discordChannels = channels;

        const channel = this.#discordChannels.find(
            (ch) => ch.id === this.#config.channel_name || ch.name === this.#config.channel_name
        );
        if (!channel) {this.#logger.log('error',`DOB verification channel not found: ${this.#config.channel_name}`);
            return;
        }
        this.#logger.log('info',`DOB verification channel found: ${channel.name}`);
        await this.#ensureVerificationMessage(channel);
        await this.#registerExistingMembers();
    }
    // Recording First join date
    async onDiscordMemberJoin(member) {
        if (!this.#config.enabled) {return;}
        try {
            const existing =
                await AgeVerificationDboEntity.findByPk(member.id);

            if (existing) {
                this.#logger.log(
                    'debug',
                    `Returning member ${member.id} already has a DOB record. Keeping original first_joined_at.`
                );
                return;
            }

            await AgeVerificationDboEntity.create({
                discord_id: member.id,
                dob: null,
                first_joined_at: new Date(),
            });

            this.#logger.log(
                'info',
                `Registered first join for ${member.user.tag} (${member.id}).`
            );
        } catch (error) {
            this.#logger.log(
                'error',
                `Failed to register first join for ${member.id}: ${error.message}`
            );
        }
    }

    async onConfigUpdate(guild, channels) {
        this.#config = Config.dob_check;
        return this.onDiscordReady(guild, channels);
    }

    async onDiscordInteraction(interaction) {
        if (!this.#config.enabled) {return;}
        try {
            if (
                interaction.isButton() &&
                interaction.customId === 'dob_check_button'
            ) {
                // Check if the user already has the member role.
                const member = await interaction.guild.members.fetch(
                    interaction.user.id
                );

                const verifiedRole = interaction.guild.roles.cache.find(
                    (role) => role.name === this.#config.verified_role
                );

                if (verifiedRole && member.roles.cache.has(verifiedRole.id)) {
                    await interaction.reply({content: `✅ You already have the ${verifiedRole.name}.`,ephemeral: true});
        return;
    }
                let verification =
                    await AgeVerificationDboEntity.findByPk(
                        interaction.user.id
                    );
                if (!verification) {
                    verification =
                        await AgeVerificationDboEntity.create({
                            discord_id: interaction.user.id,
                            dob: null,
                            first_joined_at: new Date(),
                        });

                    this.#logger.log(
                        'info',
                        `Created DOB record and recorded first_joined_at for ${interaction.user.tag} (${interaction.user.id}) from button click.`
                    );
                }
                // record first_joined_at here, if it's there, do nothing
                else if (!verification.first_joined_at) {
                    await verification.update({
                        first_joined_at: new Date(),
                    });

                    this.#logger.log(
                        'info',
                        `Recorded first_joined_at for ${interaction.user.tag} (${interaction.user.id}) from button click.`
                    );
                }

                else {
                    this.#logger.log(
                        'debug',
                        `first_joined_at already exists for ${interaction.user.tag} (${interaction.user.id}). Keeping original timestamp.`
                    );
                }
                //show DOB modal
                const modal = new ModalBuilder()
                    .setCustomId('dob_check_modal')
                    .setTitle('Age Verification');

                const dobInput = new TextInputBuilder()
                    .setCustomId('dob_input')
                    .setLabel('Date of Birth')
                    .setPlaceholder('DD/MM/YYYY')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(10)
                    .setMaxLength(10);

                const row = new ActionRowBuilder()
                    .addComponents(dobInput);

                modal.addComponents(row);

                await interaction.showModal(modal);

                return;
            }
            //submitting DOB
            if (
                interaction.isModalSubmit() &&
                interaction.customId === 'dob_check_modal'
            ) {
                await this.#handleDobSubmission(interaction);

                return;
            }
        } catch (error) {
            this.#logger.log(
                'error',
                `Error handling DOB interaction: ${error.message}`
            );

            if (
                interaction.isRepliable() &&
                !interaction.replied &&
                !interaction.deferred
            ) {
                await interaction.reply({
                    content:
                        '❌ Something went wrong while processing your verification. Please contact a moderator.',
                    ephemeral: true,
                });
            }
        }
    }

    async #handleDobSubmission(interaction) {
        const dobString = interaction.fields.getTextInputValue('dob_input');

        const dob = this.#parseDob(dobString);

        if (!dob) {
            await interaction.reply({
                content:
                    '❌ Invalid date. Please enter your date of birth in DD/MM/YYYY format.',
                ephemeral: true,
            });

            return;
        }
        // Find user in DB
        let verification =
            await AgeVerificationDboEntity.findByPk(interaction.user.id);

        /*
         * This shouldn't normally happen because guildMemberAdd
         * creates the record, but create it as a fallback.
         */
        if (!verification) {
            verification = await AgeVerificationDboEntity.create({
                discord_id: interaction.user.id,
                dob: null,
                first_joined_at: new Date(),
            });

            this.#logger.log(
                'warning',
                `No DOB record existed for ${interaction.user.id}; created fallback record.`
            );
        }
        // if DOB already there, don't change it
        if (verification.dob) {
            const existingDob = this.#normaliseDate(
                verification.dob
            );

            const submittedDob = this.#normaliseDate(dob);

            if (existingDob !== submittedDob) {
                this.#logger.log(
                    'warning',
                    `DOB mismatch for ${interaction.user.tag} (${interaction.user.id}).`
                );

                await this.#sendModerationLog(
                    interaction,
                    verification,
                    dob,
                    'DOB Mismatch',
                    0xED4245
                );

                await interaction.reply({
                    content:
                        '❌ The date of birth you entered does not match the date previously registered to this Discord account. Please contact a moderator if you believe this is an error.',
                    ephemeral: true,
                });

                return;
            }
            // same DOB as before
            this.#logger.log(
                'info',
                `Existing DOB confirmed for ${interaction.user.tag} (${interaction.user.id}).`
            );
            
            // is 18 or older check
        if (this.#is18OrOlder(dob)) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const verifiedRole = interaction.guild.roles.cache.find(
                (role) => role.name === this.#config.verified_role
            );
        if (!verifiedRole) {
            this.#logger.log(
                'error',
                `Verified role not found: ${this.#config.verified_role}`
            );

        await interaction.reply({
            content:
                '⚠️ Your age is verified, but I could not find the Member role. Please contact a moderator.',
            ephemeral: true,
            });

        return;
    }

    // User is verified in the database but no longer has the role.
    if (!member.roles.cache.has(verifiedRole.id)) {
        if (!verifiedRole.editable) {
            this.#logger.log(
                'error',
                `Cannot assign verified role ${verifiedRole.name} (${verifiedRole.id}) to ${interaction.user.id}. Role is not editable by the bot.`
            );

            await interaction.reply({
                content:
                    '⚠️ Your age is verified, but I could not assign your member role. Please contact a moderator.',
                ephemeral: true,
            });

            return;
        }

        await member.roles.add(
            verifiedRole,
            'Restored verified role after age verification'
        );

        this.#logger.log(
            'info',
            `Restored verified role for ${interaction.user.tag} (${interaction.user.id}).`
        );

            await interaction.reply({
                content:
                    '✅ Your age verification is complete. Your member role has been restored.',
                ephemeral: true,
         });

            return;
        }

        // User already has the role.
        await interaction.reply({
            content:
             '✅ Your age verification is already complete.',
            ephemeral: true,
        });

        return;
    }

             // Stored DOB says the user is under 18.
            await this.#banUnderageUser(
                interaction,
                verification,
                dob
            );

            return;
        }

         // First DOB submission.
        await verification.update({
            dob: dob,
        });

        this.#logger.log(
            'info',
            `DOB registered for ${interaction.user.tag} (${interaction.user.id}).`
        );
         // Check age.
        if (!this.#is18OrOlder(dob)) {
            await this.#banUnderageUser(
                interaction,
                verification,
                dob
            );

            return;
        }

         // User is 18+.
        this.#logger.log(
    'info',
    `${interaction.user.tag} (${interaction.user.id}) passed age verification.`
    );

    const member = await interaction.guild.members.fetch(
    interaction.user.id
    );

    const verifiedRole = interaction.guild.roles.cache.find(
    (role) => role.name === this.#config.verified_role
    );

    if (!verifiedRole) {
    this.#logger.log(
        'error',
        `Verified role not found: ${this.#config.verified_role}`
    );

    await interaction.reply({
        content:
            '⚠️ Your age was verified, but I could not assign your verified role. Please contact a moderator.',
        ephemeral: true,
    });

    return;
    }

    await member.roles.add(
    verifiedRole,
    'Passed 18+ age verification'
    );

    await interaction.reply({
    content:
        '✅ Age verification successful. Welcome to the server!',
    ephemeral: true,
    });

    await this.#sendModerationLog(
    interaction,
    verification,
    dob,
    'Age Verification Passed',
    0x57F287
    );
    }

     // Ban an underage user.
    async #banUnderageUser(interaction, verification, dob) {
        this.#logger.log(
            'warning',
            `Underage user detected: ${interaction.user.tag} (${interaction.user.id}).`
        );

        await interaction.reply({
            content:
                '❌ You must be 18 or older to access this server.',
            ephemeral: true,
        });

        await this.#sendModerationLog(
            interaction,
            verification,
            dob,
            'Underage User Banned',
            0xED4245
        );

        try {
            const member = await interaction.guild.members.fetch(
                interaction.user.id
            );

            await member.ban({
                reason: 'Failed 18+ age verification.',
            });

            this.#logger.log(
                'info',
                `Banned underage user ${interaction.user.tag} (${interaction.user.id}).`
            );
        } catch (error) {
            this.#logger.log(
                'error',
                `Failed to ban ${interaction.user.id}: ${error.message}`
            );
        }
    }

     // Send a moderation log embed.
    async #sendModerationLog(
        interaction,
        verification,
        dob,
        title,
        color
    ) {
        const config = this.#config;

        if (!config?.moderation_channel) {
            this.#logger.log(
                'warning',
                'No moderation_channel configured for DOB verification.'
            );

            return;
        }

        const moderationChannel = this.#discordChannels.find(
            (channel) =>
                channel.name === config.moderation_channel
        );

        if (!moderationChannel) {
            this.#logger.log(
                'error',
                `Moderation channel not found: ${config.moderation_channel}`
            );

            return;
        }
        const target = interaction.user;
        const modLogEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setThumbnail(target.displayAvatarURL({dynamic: true,size: 128}))
        .addFields(
            {name: 'User',value: `<@${target.id}> ID: ${target.id}`,inline: true},
            {name: 'DOB',value: this.#formatDate(dob),inline: true},
            {name: 'First Joined',value: `<t:${Math.floor(new Date(verification.first_joined_at).getTime() / 1000)}:F>`,inline: true},
            {name: 'Date',value: `<t:${Math.floor(Date.now() / 1000)}:F>`,inline: true}
        )
        .setTimestamp();

        await moderationChannel.send({
        embeds: [modLogEmbed],
        });
    }

    async #ensureVerificationMessage(channel) {
    const messages = await channel.messages.fetch({
        limit: 50,
    });

    const existingMessage = messages.find(
        (message) =>
            message.author.id === message.client.user.id &&
            message.embeds.length > 0 &&
            message.embeds[0].title === this.#config.title
    );

    if (existingMessage) {
        this.#logger.log(
            'debug',
            `DOB verification message already exists in ${channel.name}.`
        );

        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(this.#config.title)
        .setDescription(this.#config.description)
        .setColor(0x5865F2)
        .setFooter({text: 'Your date of birth will not be displayed publicly.'});

    const button = new ButtonBuilder()
        .setCustomId('dob_check_button')
        .setStyle(
            this.#getButtonStyle(
                this.#config.button_style
            )
        );

    if (this.#config.button_text) {
    button.setLabel(this.#config.button_text);
    }  
    if (this.#config.button_emoji) {
        button.setEmoji(this.#config.button_emoji);
    }

    const row = new ActionRowBuilder()
        .addComponents(button);

    await channel.send({
        embeds: [embed],
        components: [row],
    });

    this.#logger.log(
        'info',
        `Posted DOB verification message in ${channel.name}.`
    );
    }

     // Register all existing guild members.
    async #registerExistingMembers() {
        if (!this.#discordGuild) {
            return;
        }

        const members = await this.#discordGuild.members.fetch();

        for (const member of members.values()) {
            if (member.user.bot) {
                continue;
            }

            const existing =
                await AgeVerificationDboEntity.findByPk(member.id);

            const firstJoinedAt = member.joinedAt || new Date();

            if (existing && !existing.first_joined_at) {
                existing.first_joined_at = firstJoinedAt;
                await existing.save();
                this.#logger.log(
                    'info',
                    `Repaired first join for existing member ${member.user.tag}.`
                );
                continue;
            }

            if (!existing) {
                await AgeVerificationDboEntity.create({
                    discord_id: member.id,
                    dob: null,
                    first_joined_at: firstJoinedAt,
                });

                this.#logger.log(
                    'info',
                    `Registered existing member ${member.user.tag}.`
                );
            }
        }
    }

     // Parse DD/MM/YYYY.
    #parseDob(value) {
        const match = value.trim().match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );

        if (!match) {
            return null;
        }

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);

        const date = new Date(
            year,
            month - 1,
            day
        );

         // Check invalid dates such as 31/02/2005.
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        // Don't allow future DOBs.
        if (date > new Date()) {
            return null;
        }

        return date;
    }

    // Check if DOB is 18+.
    #is18OrOlder(dob) {
        const today = new Date();

        let age =
            today.getFullYear() -
            dob.getFullYear();

        const monthDifference =
            today.getMonth() -
            dob.getMonth();

        if (
            monthDifference < 0 ||
            (
                monthDifference === 0 &&
                today.getDate() < dob.getDate()
            )
        ) {
            age--;
        }

        return age >= 18;
    }

    // Normalize date for comparison.
    #normaliseDate(date) {
        const parsed = new Date(date);

        return `${parsed.getFullYear()}-${String(
            parsed.getMonth() + 1
        ).padStart(2, '0')}-${String(
            parsed.getDate()
        ).padStart(2, '0')}`;
    }
     // Format date for Discord moderation logs.
    #formatDate(date) {
        if (!date) {
            return 'Unknown';
        }

        return new Date(date).toLocaleDateString(
            'en-GB',
            {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            }
        );
    }
    
     // Convert config button style to Discord ButtonStyle.
    #getButtonStyle(style) {
        switch (style?.toLowerCase()) {
            case 'primary':
                return ButtonStyle.Primary;

            case 'secondary':
                return ButtonStyle.Secondary;

            case 'danger':
                return ButtonStyle.Danger;

            case 'success':
            default:
                return ButtonStyle.Success;
        }
    }
};
