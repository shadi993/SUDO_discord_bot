import { CreateLogger } from '../core/logger.ts';
import { Config } from '../core/config.ts';
import { PostCountDboEntity } from './models/postCountDboEntity.model.ts';
import { Logger } from 'log4js';
import { Collection, Guild, Message, NonThreadGuildBasedChannel, Role, TextChannel } from 'discord.js';

class UserInformation{
    #logger? : Logger;
    #discordId?: string;
    #dbEntity?: PostCountDboEntity;

    async init(logger: Logger, discordId: string) {
        this.#logger = logger;
        this.#discordId = discordId;

        const dbResult = await PostCountDboEntity.findAll({ where: { discord_id: discordId } });

        if (dbResult.length > 0) {
            this.#dbEntity = dbResult[0];
        } else {
            this.#dbEntity = new PostCountDboEntity({ discord_id: discordId, xp: 0 });
            this.#logger.log('trace', `Creating new db entry in database for ${this.#discordId}`);
            await this.#dbEntity.save();
        }
    }

    /**
     * Handle a message from the user and give them experience points if enough time has passed.
     * @returns {boolean} True if the user leveled up, false otherwise.
     */
    async handleMessage() {
        if (!Config.leveling.enabled)
            return;

        const now: number = new Date().getUTCMilliseconds();
        if (now - this.lastXpGainDateMillis < Config.leveling.min_time_between_messages_seconds * 1000)
            return false

        const previousLevel = this.level;

        this.#dbEntity!.xp += 1;

        this.#logger!.log('trace', `Updating ${this.#discordId} in database.`);
        await this.#dbEntity!.save();

        if (this.level > previousLevel) {
            this.#logger!.log('info', `User ${this.#discordId} leveled up!`);
            return true;
        }

        return false;
    }

    get discordId(): string {
        return this.#discordId!;
    }

    get xp() : number{
        return this.#dbEntity!.xp;
    }

    get lastXpGainDateMillis(): number {
        return this.#dbEntity!.updatedAt.getUTCMilliseconds();
    }

    get level(): number {
        // TODO: Come up with some cool formula for calculating the level
        return Math.floor(Math.log2(this.xp + 1));
    }
};

/**
 * Module for handling the leveling system.
 * Users on the server will gain experience points for chatting.
 */
export class LevelingModule {
    #logger;
    #discordUsersMap: Map<string, UserInformation>;
    #guild? : Guild;
    #channelsToIgnore?: string[];
    #levelupAnnouncementChannel?: TextChannel;

    constructor() {
        this.#logger = CreateLogger('LevelingModule');
        this.#discordUsersMap = new Map();
    }

    /*eslint no-unused-vars: ["error", {"args": "none"}]*/
    async onDiscordReady(
        guild: Guild,
        channels: Collection<string, NonThreadGuildBasedChannel | null>,
        roles: Collection<string, Role>) {
        this.#logger.log('info', 'Leveling module is ready.');

        this.#guild = guild;
        this.#channelsToIgnore = [];

        for (const channelName of Config.leveling.ignore_channels) {
            const channel = channels.find(channel => channel!.name === channelName);
            if (channel) {
                this.#channelsToIgnore.push(channel.id);
            } else {
                this.#logger.log('warn', `Channel ${channelName} not found in the server.`);
            }
        }

        this.#levelupAnnouncementChannel = channels.find(channel => channel!.name === Config.leveling.announcement_channel_name)! as TextChannel;

        if (!this.#levelupAnnouncementChannel) {
            this.#logger.log('error', `Channel ${Config.leveling.announcement_channel_name} not found in the server.`);
            throw new Error('Leveling announcement channel not found.');
        }
    }

    async onDiscordMessage(message: Message<boolean>) {
        if (this.#channelsToIgnore!.includes(message.channel.id))
        {
            this.#logger.log('trace', `Ignoring message in channel ${(message.channel as TextChannel).name}`);
            return;
        }

        var discordId = message.author.id;
        var userInfo = this.#discordUsersMap.get(discordId);

        if (!userInfo) {
            userInfo = new UserInformation();
            await userInfo.init(this.#logger, discordId);
            this.#discordUsersMap.set(discordId, userInfo);
        }

        const leveledUp = await userInfo.handleMessage();

        if (leveledUp) {
            await this.sendLevelupMessage(discordId, userInfo.level);
        }

        this.#logger.log('trace', `User ${discordId} has ${userInfo.xp} xp (level ${userInfo.level})`);
    }

    async sendLevelupMessage(discordId: string, level: number) {
        this.#guild!.members.fetch(discordId).then(async (user) => {
            const message = 
                `:partying_face: **Congratulations**, ${user}!\n You climbed from level **${level-1}** to **${level}**. Keep it up!`;
            await this.#levelupAnnouncementChannel!.send(message);
        });
    }
};
