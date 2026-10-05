import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ActivityType } from 'discord.js';
import { CreateLogger } from '../core/logger.mjs';
import { DiscordClient } from '../core/discord-client.mjs';

const profileDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/bot-profile-defaults');
const manifestPath = path.join(profileDirectory, 'defaults.json');
const presencePath = path.join(profileDirectory, 'presence.json');
const imageTypes = new Set(['png', 'jpeg', 'gif', 'webp']);
const maxImageBytes = 8 * 1024 * 1024;
const presenceStatuses = new Set(['online', 'idle', 'dnd', 'invisible']);

export class BotProfileInputError extends Error {}

export const BotProfileModule = class {
    #logger;
    #user;
    #defaultAvatar;
    #defaultBanner;
    #status = 'online';
    #statusText = '';
    #ready = false;

    constructor() {
        this.#logger = CreateLogger('BotProfile');
    }

    async onDiscordReady() {
        this.#user = DiscordClient.user;
        if (!this.#user) throw new Error('Discord client user is not available.');
        await this.#loadDefaultImages();
        await this.#loadPresence();
        this.#ready = true;
        this.#logger.info('Bot profile module is ready.');
    }

    isReady() {
        return this.#ready;
    }

    getProfile() {
        this.#assertReady();
        return {
            username: this.#user.username,
            avatar: this.#user.displayAvatarURL({ extension: 'png', size: 1024 }),
            banner: this.#user.bannerURL({ extension: 'png', size: 1024 }),
            status: this.#status,
            statusText: this.#statusText
        };
    }

    async updateProfile(updates) {
        this.#assertReady();
        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            throw new BotProfileInputError('Profile updates must be an object.');
        }

        const userUpdates = {};
        if (Object.hasOwn(updates, 'avatar')) userUpdates.avatar = this.#validateImage(updates.avatar);
        if (Object.hasOwn(updates, 'banner')) userUpdates.banner = this.#validateImage(updates.banner);

        if (Object.hasOwn(updates, 'status')) {
            if (!presenceStatuses.has(updates.status)) throw new BotProfileInputError('Choose a valid bot visibility status.');
        }
        if (Object.hasOwn(updates, 'statusText')) {
            if (typeof updates.statusText !== 'string' || updates.statusText.length > 128) {
                throw new BotProfileInputError('Status text must be 128 characters or fewer.');
            }
        }

        if (Object.keys(userUpdates).length) await this.#user.edit(userUpdates);
        if (Object.hasOwn(updates, 'status') || Object.hasOwn(updates, 'statusText')) {
            const status = updates.status ?? this.#status;
            const statusText = updates.statusText ?? this.#statusText;
            await this.#user.setPresence(this.#presenceData(status, statusText));
            this.#status = status;
            this.#statusText = statusText;
            await fs.writeFile(presencePath, `${JSON.stringify({ status, statusText }, null, 4)}\n`);
        }

        return this.getProfile();
    }

    async resetImage(image) {
        this.#assertReady();
        if (image !== 'avatar' && image !== 'banner') {
            throw new BotProfileInputError('Choose either avatar or banner to reset.');
        }
        const buffer = image === 'avatar' ? this.#defaultAvatar : this.#defaultBanner;
        await this.#user.edit({ [image]: buffer });
        return this.getProfile();
    }

    #assertReady() {
        if (!this.#ready) throw new Error('Bot profile is not ready until the Discord client is connected.');
    }

    #validateImage(dataUrl) {
        if (typeof dataUrl !== 'string') throw new BotProfileInputError('Choose an image file to upload.');
        const match = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
        if (!match || !imageTypes.has(match[1])) throw new BotProfileInputError('Image must be PNG, JPEG, GIF, or WebP.');
        const image = Buffer.from(match[2], 'base64');
        if (image.length === 0 || image.length > maxImageBytes) {
            throw new BotProfileInputError('Image must be smaller than 8 MB.');
        }
        return image;
    }

    async #loadDefaultImages() {
        await fs.mkdir(profileDirectory, { recursive: true });
        let manifest;
        try {
            manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            manifest = null;
        }

        if (manifest) {
            this.#defaultAvatar = manifest.avatar ? await fs.readFile(path.join(profileDirectory, 'avatar.png')) : null;
            this.#defaultBanner = manifest.banner ? await fs.readFile(path.join(profileDirectory, 'banner.png')) : null;
            return;
        }

        this.#defaultAvatar = await this.#downloadImage(this.#user.avatarURL({ extension: 'png', size: 1024 }));
        this.#defaultBanner = await this.#downloadImage(this.#user.bannerURL({ extension: 'png', size: 1024 }));
        if (this.#defaultAvatar) await fs.writeFile(path.join(profileDirectory, 'avatar.png'), this.#defaultAvatar);
        if (this.#defaultBanner) await fs.writeFile(path.join(profileDirectory, 'banner.png'), this.#defaultBanner);
        await fs.writeFile(manifestPath, `${JSON.stringify({
            avatar: Boolean(this.#defaultAvatar),
            banner: Boolean(this.#defaultBanner)
        }, null, 4)}\n`);
    }

    async #loadPresence() {
        let savedPresence;
        try {
            savedPresence = JSON.parse(await fs.readFile(presencePath, 'utf8'));
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        const activity = this.#user.presence?.activities[0];
        const status = presenceStatuses.has(savedPresence?.status)
            ? savedPresence.status
            : (presenceStatuses.has(this.#user.presence?.status) ? this.#user.presence.status : 'online');
        const statusText = typeof savedPresence?.statusText === 'string' && savedPresence.statusText.length <= 128
            ? savedPresence.statusText
            : (activity?.type === ActivityType.Custom ? activity.state || '' : activity?.name || '');
        await this.#user.setPresence(this.#presenceData(status, statusText));
        this.#status = status;
        this.#statusText = statusText;
        await fs.writeFile(presencePath, `${JSON.stringify({ status, statusText }, null, 4)}\n`);
    }

    #presenceData(status, statusText) {
        return {
            status,
            activities: statusText
                ? [{ name: 'Custom Status', state: statusText, type: ActivityType.Custom }]
                : []
        };
    }

    async #downloadImage(url) {
        if (!url) return null;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not download the bot's default profile image (${response.status}).`);
        const image = Buffer.from(await response.arrayBuffer());
        if (image.length > maxImageBytes) throw new Error('Bot default profile image exceeds the 8 MB limit.');
        return image;
    }
};
