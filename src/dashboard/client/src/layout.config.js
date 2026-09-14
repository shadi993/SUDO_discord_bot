/**
 * Declarative dashboard layout for feature modules.
 *
 * New modules only need a section in config.json and a layout entry here.
 * Supported field types include toggle, channel, role, channels, roles,
 * frames, number, text, and json.
 */
export const dashboardLayout = {
    sections: {
        leveling: {
            label: 'Leveling',
            fields: {
                enabled: {type: 'toggle'},
                min_time_between_messages_seconds: {type: 'number', label: 'Minimum time between messages (seconds)'},
                announcement_channel_name: {type: 'channel'},
                ignore_channels: {type: 'channels'},
                roles: {type: 'level-roles'}
            }
        },
        disboard: {
            label: 'Disboard',
            fields: {enabled: {type: 'toggle'}, message: {type: 'text'}}
        },
        autorole: {
            label: 'Autorole',
            fields: {enabled: {type: 'toggle'}, assign_on_join: {type: 'roles'}}
        },
        notify: {
            label: 'Notifications',
            fields: {enabled: {type: 'toggle'}, channel: {type: 'channel'}}
        },
        rank: {
            label: 'Rank',
            fields: {enabled: {type: 'toggle'}, channel_allowed: {type: 'channel'}}
        },
        autokick: {
            label: 'Auto kick',
            fields: {
                enabled: {type: 'toggle'},
                account_age_limit: {type: 'number', label: 'Account age limit (days)'},
                info_enabled: {type: 'toggle'},
                info_channel: {type: 'channel'}
            }
        },
        moderation: {
            label: 'Moderation',
            fields: {enabled: {type: 'toggle'}, channel_name: {type: 'channel'}}
        },
        ticketSystem: {
            label: 'Ticket system',
            fields: {
                enabled: {type: 'toggle'},
                category_name: {type: 'channel'},
                moderator: {type: 'role'},
                archives_channel: {type: 'channel'}
            }
        },
        dob_check: {
            label: 'DOB check',
            fields: {
                enabled: {type: 'toggle'},
                channel_name: {type: 'channel'},
                moderation_channel: {type: 'channel'},
                verified_role: {type: 'role'},
                title: {type: 'text'},
                description: {type: 'text'},
                button_text: {type: 'text'},
                button_emoji: {type: 'text'},
                button_style: {type: 'text'}
            }
        },
        ban_emoji: {
            label: 'Ban emoji',
            fields: {enabled: {type: 'toggle'}, log: {type: 'toggle'}, log_channel: {type: 'channel'}, emojis: {type: 'frames', addLabel: 'Add emoji', itemLabel: 'Emoji'}}
        },
        honeypot: {
            label: 'Honeypot',
            fields: {
                enabled: {type: 'toggle'},
                channel_name: {type: 'channel'},
                log_channel_name: {type: 'channel'},
                title: {type: 'text'},
                description: {type: 'text'},
                button_text: {type: 'text'},
                punishment: {type: 'text'}
            }
        },
        persistentMessages: {
            label: 'Persistent messages',
            fields: {enabled: {type: 'toggle'}, messages: {type: 'frames', addLabel: 'Add message', itemLabel: 'Message'}}
        },
        roles: {
            label: 'Roles',
            fields: {
                enabled: {type: 'toggle'},
                panels: {
                    type: 'frames',
                    addLabel: 'Add role panel',
                    itemLabel: 'Role panel',
                    editor: 'roles',
                    fields: {
                        channel_name: {type: 'channel', label: 'Channel name'},
                        id: {type: 'number', label: 'Panel ID'},
                        title: {type: 'text', label: 'Title'},
                        exclusive_group: {type: 'toggle', label: 'Exclusive group'},
                        options: {
                            type: 'frames',
                            addLabel: 'Add role option',
                            itemLabel: 'Role option',
                            fields: {
                                description: {type: 'text', label: 'Description'},
                                role_name: {type: 'role', label: 'Role name'},
                                button_emoji: {type: 'text', label: 'Button emoji'},
                                button_text: {type: 'text', label: 'Button text'},
                                button_style: {type: 'text', label: 'Button style'},
                                required_role: {type: 'role', label: 'Required role'},
                                requirements: {
                                    type: 'object',
                                    fields: {level: {type: 'number', label: 'Required level'}}
                                }
                            }
                        }
                    }
                }
            }
        },
        thresholdMessages: {
            label: 'Threshold messages',
            fields: {enabled: {type: 'toggle'}, messages: {type: 'frames', addLabel: 'Add message', itemLabel: 'Message'}}
        }
    },
    defaultSection: {fields: {}}
};

export const getSectionLayout = section => dashboardLayout.sections[section] || dashboardLayout.defaultSection;
