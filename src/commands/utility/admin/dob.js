import {SlashCommandBuilder,EmbedBuilder,PermissionFlagsBits,} from 'discord.js';
import * as fs from 'node:fs';
import { AgeVerificationDboEntity } from '../../../core/database.mjs';

export const data = new SlashCommandBuilder()
    .setName('dob')
    .setDescription('View or modify a user\'s age verification information.')
    .addSubcommand(subcommand =>
        subcommand
            .setName('info')
            .setDescription('View a user\'s DOB verification information.')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('The user to view.')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('change')
            .setDescription('Change a user\'s DOB verification information.')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('The user to modify.')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('field')
                    .setDescription('The information to change.')
                    .setRequired(true)
                    .addChoices(
                        {name: 'Date of Birth',value: 'dob'},
                        {name: 'First Joined At',value: 'first_joined_at'}
                    )
            )
            .addStringOption(option =>
                option
                    .setName('value')
                    .setDescription('The new date in DD/MM/YYYY format.')
                    .setRequired(true)
            )
            
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('delete')
            .setDescription('Delete a user\'s entire DOB verification record.')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('The user whose DOB record should be deleted.')
                    .setRequired(true)
            )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
        const guild = interaction.guild;

        if (!guild) {
            return await interaction.editReply({
                content: 'This command can only be used inside a server.',
            });
        }
        // dob info
        if (subcommand === 'info') {
            const verification =
                await AgeVerificationDboEntity.findByPk(target.id);

            if (!verification) {
                return await interaction.editReply({
                    content:
                        `No DOB verification record exists for ${target.tag}.`,
                });
            }

            const dobDisplay = verification.dob
                ? formatDate(verification.dob)
                : 'Not registered';

            const firstJoinedDisplay = verification.first_joined_at
                ? `<t:${Math.floor(
                    new Date(verification.first_joined_at).getTime() / 1000
                )}:F>`
                : 'Unknown';

            const is18Plus =
                verification.dob
                    ? is18OrOlder(new Date(verification.dob))
                    : null;

            const ageStatus =
                is18Plus === null
                    ? 'Not verified'
                    : is18Plus
                        ? '18+'
                        : 'Under 18';

            const embed = new EmbedBuilder()
                .setColor(
                    is18Plus === false
                        ? '#ED4245'
                        : '#5865F2'
                )
                .setTitle('🔞 DOB Verification Information')
                .setThumbnail(
                    target.displayAvatarURL({
                        dynamic: true,
                        size: 128,
                    })
                )
                .addFields(
                    {name: 'User',value: `<@${target.id}> ID: ${target.id}`,inline: false},
                    {name: 'Date of Birth',value: dobDisplay,inline: true},
                    {name: 'Age Status',value: ageStatus,inline: true},
                    {name: 'First Joined',value: firstJoinedDisplay,inline: true}
                )
                .setTimestamp();

            return await interaction.editReply({
                embeds: [embed],
            });
        }
        // dob change
        if (subcommand === 'change') {
            const field =
                interaction.options.getString('field');

            const value =
                interaction.options.getString('value');

            const verification =
                await AgeVerificationDboEntity.findByPk(target.id);

            if (!verification) {
                return await interaction.editReply({
                    content:
                        `No DOB verification record exists for ${target.tag}.`,
                });
            }

            const date = parseDate(value);

            if (!date) {
                return await interaction.editReply({
                    content:
                        'Invalid date. Please use **DD/MM/YYYY** format.',
                });
            }
            // change dob in db
            if (field === 'dob') {
                const oldDob = verification.dob;

                await verification.update({
                    dob: date,
                });

                await sendChangeLog(
                    interaction,
                    target,
                    field,
                    oldDob,
                    date
                );

                const ageStatus = is18OrOlder(date)
                    ? '18+'
                    : 'Under 18';

                const embed = new EmbedBuilder()
                    .setColor(
                        is18OrOlder(date)
                            ? '#57F287'
                            : '#ED4245'
                    )
                    .setTitle('🔞 DOB Changed')
                    .setThumbnail(
                        target.displayAvatarURL({
                            dynamic: true,
                            size: 128,
                        })
                    )
                    .addFields(
                        {name: 'User',value: `<@${target.id}> ID: ${target.id}`,inline: true},
                        {name: 'New DOB',value: formatDate(date),inline: true},
                        {name: 'Age Status',value: ageStatus,inline: true},
                        {name: 'Moderator',value: `${interaction.user.tag}`,inline: true},
                        {name: 'Date',value: `<t:${Math.floor(Date.now() / 1000)}:F>`,inline: true}
                    )
                    .setTimestamp();

                return await interaction.editReply({
                    content:
                        `Successfully changed the DOB for ${target.tag}.`,
                    embeds: [embed],
                });
            }
            // change first joined at
            if (field === 'first_joined_at') {
                const oldFirstJoinedAt =
                    verification.first_joined_at;

                await verification.update({
                    first_joined_at: date,
                });

                await sendChangeLog(
                    interaction,
                    target,
                    field,
                    oldFirstJoinedAt,
                    date
                );

                const embed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('📅 First Joined Date Changed')
                    .setThumbnail(
                        target.displayAvatarURL({
                            dynamic: true,
                            size: 128,
                        })
                    )
                    .addFields(
                        {name: 'User',value: `<@${target.id}> ID: ${target.id}`,inline: true},
                        {name: 'New First Joined',value: `<t:${Math.floor(date.getTime() / 1000)}:F>`,inline: true},
                        {name: 'Moderator',value: `${interaction.user.tag}`,inline: true},
                        {name: 'Date',value: `<t:${Math.floor(Date.now() / 1000)}:F>`,inline: true}
                    )
                    .setTimestamp();

                return await interaction.editReply({
                    content:
                        `Successfully changed the first joined date for ${target.tag}.`,
                    embeds: [embed],
                });
            }

            return await interaction.editReply({
                content: 'Invalid field specified.',
            });
        }
        //dob delete
        if (subcommand === 'delete') {
            const verification =
                await AgeVerificationDboEntity.findByPk(
                    target.id
                );

             // No record exists.
            if (!verification) {
                return await interaction.editReply({
                    content:
                        `No DOB verification record exists for ${target.tag}. Nothing was deleted.`,
                });
            }

             // Save the old values for the moderation log before deleting the database row.
            const oldDob =
                verification.dob;

            const oldFirstJoinedAt =
                verification.first_joined_at;

             // Delete the ENTIRE database row.
            await verification.destroy();
            // Send moderation log.
            await sendDeleteLog(
                interaction,
                target,
                oldDob,
                oldFirstJoinedAt
            );
             // Confirm deletion to moderator.
            const embed =
                new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle(
                        '🗑️ DOB Verification Record Deleted'
                    )
                    .setThumbnail(
                        target.displayAvatarURL({
                            dynamic: true,
                            size: 128,
                        })
                    )
                    .addFields(
                        {name: 'User',value:`<@${target.id}> ID: ${target.id}`,inline: false},
                        {name: 'Previous DOB',value:oldDob? formatDate(oldDob): 'Not registered',inline: true},
                        {name: 'Previous First Joined',value:oldFirstJoinedAt? `<t:${Math.floor(new Date(oldFirstJoinedAt).getTime() / 1000)}:F>`: 'Not set',inline: true},
                        {name: 'Moderator',value:`${interaction.user.tag}`,inline: true},
                        {name: 'Date',value:`<t:${Math.floor(Date.now() / 1000)}:F>`,inline: true}
                    )
                    .setDescription(
                        `The entire DOB verification record for ${target.tag} has been permanently deleted.`
                    )
                    .setTimestamp();

            return await interaction.editReply({
                embeds: [embed],
            });
        }
    } catch (err) {
        console.error(
            'Error during dob command execution:',
            err
        );

        await interaction.editReply({
            content:
                `Failed to process the DOB command for ${target.tag}. Another error occurred.`,
        });
    }
}

// send moderation log
async function sendChangeLog(
    interaction,
    target,
    field,
    oldValue,
    newValue
) {
    try {
        const config = JSON.parse(
            fs.readFileSync('config.json', 'utf8')
        ).dob_check;

        if (!config?.moderation_channel) {
            console.warn(
                'No moderation_channel configured for DOB changes.'
            );

            return;
        }

        const moderationChannel =
            interaction.guild.channels.cache.find(
                channel =>
                    channel.name ===
                    config.moderation_channel
            );

        if (!moderationChannel) {
            console.warn(
                `DOB moderation channel "${config.moderation_channel}" not found.`
            );

            return;
        }

        const fieldName =
            field === 'dob'
                ? 'Date of Birth'
                : 'First Joined At';

        const oldValueDisplay =
            oldValue
                ? field === 'dob'
                    ? formatDate(oldValue)
                    : `<t:${Math.floor(
                        new Date(oldValue).getTime() / 1000
                    )}:F>`
                : 'Not set';

        const newValueDisplay =
            field === 'dob'
                ? formatDate(newValue)
                : `<t:${Math.floor(
                    new Date(newValue).getTime() / 1000
                )}:F>`;

        const modLogEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🔄 DOB Information Changed')
            .setThumbnail(
                target.displayAvatarURL({
                    dynamic: true,
                    size: 128,
                })
            )
            .addFields(
                {name: 'User',value: `<@${target.id}> ID: ${target.id}`,inline: false},
                {name: 'Changed Field',value: fieldName,inline: true},
                {name: 'Old Value',value: oldValueDisplay,inline: true},
                {name: 'New Value',value: newValueDisplay,inline: true},
                {name: 'Moderator',value: `${interaction.user.tag}`,inline: true},
                {name: 'Date',value: `<t:${Math.floor(Date.now() / 1000)}:F>`,inline: true}
            )
            .setTimestamp();

        await moderationChannel.send({
            embeds: [modLogEmbed],
        });
    } catch (error) {
        console.error(
            'Failed to send DOB change log:',
            error
        );
    }
}
// moderation log for deleting record
async function sendDeleteLog(
    interaction,
    target,
    oldDob,
    oldFirstJoinedAt
) {
    try {
        const config =
            JSON.parse(
                fs.readFileSync(
                    'config.json',
                    'utf8'
                )
            ).dob_check;

        if (!config?.moderation_channel) {
            console.warn(
                'No moderation_channel configured for DOB deletion logs.'
            );

            return;
        }

        const moderationChannel =
            interaction.guild.channels.cache.find(
                channel =>
                    channel.name ===
                    config.moderation_channel
            );

        if (!moderationChannel) {
            console.warn(
                `DOB moderation channel "${config.moderation_channel}" not found.`
            );

            return;
        }

        const oldDobDisplay =
            oldDob
                ? formatDate(oldDob)
                : 'Not registered';

        const oldFirstJoinedDisplay =
            oldFirstJoinedAt
                ? `<t:${Math.floor(
                      new Date(
                          oldFirstJoinedAt
                      ).getTime() / 1000
                  )}:F>`
                : 'Not set';

        const modLogEmbed =
            new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle(
                    '🗑️ DOB Verification Record Deleted'
                )
                .setThumbnail(
                    target.displayAvatarURL({
                        dynamic: true,
                        size: 128,
                    })
                )
                .addFields(
                    {name: 'User',value:`<@${target.id}> ID: ${target.id}`,inline: false},
                    {name: 'Deleted DOB',value: oldDobDisplay,inline: true},
                    {name: 'Deleted First Joined',value: oldFirstJoinedDisplay,inline: true},
                    {name: 'Moderator',value:`${interaction.user.tag}`,inline: true},
                    {name: 'Date',value:`<t:${Math.floor(Date.now() / 1000)}:F>`,inline: true,}
                )
                .setDescription(
                    'The entire age verification database row was deleted.'
                )
                .setTimestamp();

        await moderationChannel.send({
            embeds: [modLogEmbed],
        });
    } catch (error) {
        console.error(
            'Failed to send DOB deletion log:',
            error
        );
    }
}

 // Parse DD/MM/YYYY into a Date object.
function parseDate(value) {
    const match = value
        .trim()
        .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

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

    // check invalid dates 
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    // Don't allow future dates.
    if (date > new Date()) {
        return null;
    }

    return date;
}

 // Check if DOB is 18+.
function is18OrOlder(dob) {
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
 // Format date as DD/MM/YYYY.
function formatDate(date) {
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
