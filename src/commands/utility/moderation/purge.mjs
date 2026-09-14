const purgeOptions = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
};

const deleteMessages = async messages => {
    if (!messages.size) return 0;
    const recent = messages.filter(message =>
        message.createdTimestamp >= Date.now() - 14 * 24 * 60 * 60 * 1000
    );
    const old = messages.filter(message => !recent.has(message.id));
    let deleted = 0;

    if (recent.size) {
        await messages.first().channel.bulkDelete(recent, true);
        deleted += recent.size;
    }

    for (const message of old.values()) {
        await message.delete();
        deleted += 1;
    }
    return deleted;
};

export const purgeUserMessages = async (guild, userId, scope) => {
    const cutoff = purgeOptions[scope] ? Date.now() - purgeOptions[scope] : null;
    let deleted = 0;

    for (const channel of guild.channels.cache.values()) {
        if (!channel.isTextBased() || !channel.messages?.fetch) continue;

        try {
            let before;
            while (true) {
                const messages = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
                if (!messages.size) break;

                const matching = messages.filter(message =>
                    message.author?.id === userId && (!cutoff || message.createdTimestamp >= cutoff)
                );
                deleted += await deleteMessages(matching);

                const oldest = messages.last();
                if (!oldest || (cutoff && oldest.createdTimestamp < cutoff)) break;
                before = oldest.id;
            }
        } catch (error) {
            console.warn(`Could not purge messages in channel ${channel.id}: ${error.message}`);
        }
    }

    return deleted;
};
