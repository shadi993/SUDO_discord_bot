export const findDiscordChannel = (channels, identifier) => {
    if (!identifier) return undefined;
    return channels.find(channel => channel.id === identifier || channel.name === identifier);
};

export const isAllowedChannel = (channel, allowedChannel, channels) => {
    if (!channel || !allowedChannel || !channels) return false;

    const configuredChannel = findDiscordChannel(channels, allowedChannel);
    if (!configuredChannel) return false;

    return channel.id === configuredChannel.id || channel.name === configuredChannel.name || channel.id === allowedChannel || channel.name === allowedChannel;
};
