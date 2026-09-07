export const findDiscordChannel = (channels, identifier) => {
    if (!identifier) return undefined;
    return channels.find(channel => channel.id === identifier || channel.name === identifier);
};
