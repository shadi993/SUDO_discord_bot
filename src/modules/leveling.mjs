import { CreateLogger } from '../core/logger.mjs';
import { Config } from '../core/config.mjs';
import { PostCountDboEntity } from '../core/database.mjs';



const levelSteps  = [
    0,
    70,
    277,
    625,
    1111,
    1736,
    2500,
    3402,
    4444,
    5625,
    6944,
    8402,
    10000,
    11756,
    13631,
    15625,
    17777,
    20069,
    22500 ,
    25069 ,
    27777 ,
    30625,
    33611,
    36736,
    40000,
    42500,
    46944 ,
    50625,
    54444,
    58402,
    62500,
    66736 ,
    71111,
    75625 ,
    80277,
    85069 ,
    90000,
    95069,
    100277,
    105625,
    111111,
    116736,
    122500,
    128402,
    134444,
    140625,
    146941,
    153402,
    160000,
    166736,
    172000,
    177000,
    180000,
    190000,
    202500,
    210069,
    217777,
    225625,
    233611,
    250000,
    258402,
    262560,
    275625,
    284444,
    300000,
    310069,
    333300,
    348265,
    369999,
    380060,
    399999,
    412345,
    438723,
    455889,
    472651,
    491050,
    500500,
    520784,
    533483,
    554552,
    578264,
    589774,
    610221,
    629442,
    640239,
    678875,
    691239,
    711111,
    728012,
    742379,
    759999,
    770869,
    794583,
    809541,
    821668,
    843354,
    860666,
    888888,
    900000,
    930000,
    950000,
];
const minexp = 10;
const maxexp = 40;
const UserInformation = class {
    #logger;
    #discordId;
    #dbEntity;

    async init(logger, discordId) {
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

        const now = new Date();
        if (now - this.lastXpGainDate < Config.leveling.min_time_between_messages_seconds * 1000)
            return false

        const previousLevel = this.level;

        this.#dbEntity.xp += Math.floor(Math.random() * (maxexp - minexp + 1) + minexp);

        this.#logger.log('trace', `Updating ${this.#discordId} in database.`);
        await this.#dbEntity.save();

        if (this.level > previousLevel) {
            this.#logger.log('info', `User ${this.#discordId} leveled up!`);
            return true;
        }

        return false;
    }

    get discordId() {
        return this.#discordId;
    }

    get xp() {
        return this.#dbEntity.xp;
    }

    get lastXpGainDate() {
        return this.#dbEntity.updatedAt;
    }

    get level() {
        for(let i= 0; i< levelSteps.length; ++i){
            if (levelSteps[i] > this.xp){
                return i;
            }
            if (i === levelSteps.length -1){
                return i;
            }
        }
        return 0;
    }
};

/**
 * Module for handling the leveling system.
 * Users on the server will gain experience points for chatting.
 */
export function calculateXPForLevel(level) {
    if (level < 1 || level > levelSteps.length) {
        return undefined;
    }
    return levelSteps[level - 1]; // Return XP for that level
}

export const LevelingModule = class {
    #logger;
    #discordUsersMap;
    #guild;
    #channelsToIgnore;
    #levelupAnnouncementChannel;
    #discordRoles;
    constructor() {
        this.#logger = CreateLogger('LevelingModule');
        this.#discordUsersMap = new Map();
    }

    static calculateLevel(xp) {
        for (let i = 0; i < levelSteps.length; ++i) {
            if (levelSteps[i] > xp) {
                return i;
            }
        }
        return levelSteps.length - 1; // Max level if XP exceeds the highest level
    }

    static calculateNextLevelXP(currentLevel) {
        if (currentLevel >= levelSteps.length - 1) {
            return 'Max level reached'; // Or handle max level differently if you prefer
        }
        return levelSteps[currentLevel];
    }

    /*eslint no-unused-vars: ["error", {"args": "none"}]*/
    async onDiscordReady(guild, channels, roles) {
        this.#logger.log('info', 'Leveling module is ready.');

        this.#guild = guild;
        this.#channelsToIgnore = [];
        this.#discordRoles = roles;
        for (const channelName of Config.leveling.ignore_channels) {
            const channel = channels.find(channel => channel.name === channelName);
            if (channel) {
                this.#channelsToIgnore.push(channel.id);
            } else {
                this.#logger.log('warn', `Channel ${channelName} not found in the server.`);
            }
        }

        this.#levelupAnnouncementChannel = channels.find(channel => channel.name === Config.leveling.announcement_channel_name);

        if (!this.#levelupAnnouncementChannel) {
            this.#logger.log('error', `Channel ${Config.leveling.announcement_channel_name} not found in the server.`);
            throw new Error('Leveling announcement channel not found.');
        }
    }

    async onDiscordMessage(message) {
        //to ignore messages from bots
        if (message.author.bot) {
            this.#logger.log('trace', `Ignoring bot message from ${message.author.tag}`);
            return;
        }

        if (this.#channelsToIgnore.includes(message.channel.id))
        {
            this.#logger.log('trace', `Ignoring message in channel ${message.channel.name}`);
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
            if (userInfo.level.toString() in Config.leveling.roles) {
                for (const [, value] of Object.entries(Config.leveling.roles)) {
                    const discordRole = this.#discordRoles.find((discordRole) => discordRole.name === value);
                    if (message.member.roles.cache.find((memberRole) => memberRole.id === discordRole.id)){
                        message.member.roles.remove(discordRole);
                        console.log("removing role " + value)
                    }
                }

                console.log("adding role " + Config.leveling.roles[userInfo.level.toString()])
                const discordRole = this.#discordRoles.find((discordRole) => discordRole.name === Config.leveling.roles[userInfo.level.toString()]);
                message.member.roles.add(discordRole);
            }
        }

        this.#logger.log('trace', `User ${discordId} has ${userInfo.xp} xp (level ${userInfo.level})`);
    }

    async sendLevelupMessage(discordId, level) {
        this.#guild.members.fetch(discordId).then(async (user) => {
            const message = 
                `:partying_face: **Congratulations**, ${user}!\n You climbed from level **${level-1}** to **${level}**. Keep it up!`;
            await this.#levelupAnnouncementChannel.send(message);
        });
    }
    
};
