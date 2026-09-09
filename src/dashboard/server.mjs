import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { PermissionFlagsBits } from 'discord.js';
import { UpdateConfig } from '../core/config.mjs';
import { CreateLogger } from '../core/logger.mjs';
import { getDailyStats, recordDailyMemberCount } from './stats.mjs';

let logger;
const app = express();
const sessions = new Map();
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
const dashboardFiles = {
    'config.json': 'config.json'
};

app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(root, 'src/dashboard/dist')));

const getDashboardRedirectUri = request => {
    const configuredUri = process.env.DISCORD_DASHBOARD_REDIRECT_URI;
    if (configuredUri) {
        const configuredUrl = new URL(configuredUri);
        const requestHost = request.get('host');
        const isLocalhost = configuredUrl.hostname === 'localhost'
            || configuredUrl.hostname === '127.0.0.1'
            || configuredUrl.hostname === '::1';
        if (!isLocalhost || !requestHost || requestHost.startsWith(`${configuredUrl.hostname}:`)) {
            return configuredUri;
        }
    }

    const forwardedProtocol = request.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const protocol = forwardedProtocol || request.protocol;
    return `${protocol}://${request.get('host')}/auth/callback`;
};

const getCookie = (request, name) => {
    const cookies = request.headers.cookie?.split(';').map(value => value.trim()) || [];
    const cookie = cookies.find(value => value.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
};

const createSession = (user) => {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { user, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    return token;
};

const requireAdmin = (request, response, next) => {
    const token = getCookie(request, 'sudo_dashboard_session');
    const session = token && sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
        if (token) sessions.delete(token);
        return response.status(401).json({ error: 'Administrator login required.' });
    }
    request.dashboardUser = session.user;
    return next();
};

const discordRequest = async (endpoint, options = {}) => {
    const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
        ...options,
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, ...options.headers }
    });
    if (!response.ok) throw new Error(`Discord API returned ${response.status}.`);
    return response.json();
};

const isAdmin = (member, guild, roles = []) => {
    if (!member?.user?.id || !guild?.owner_id) return false;
    if (guild.owner_id === member.user.id) return true;

    const administrator = BigInt(PermissionFlagsBits.Administrator);
    const permissionValues = [
        member.permissions,
        ...roles
            .filter(role => member.roles?.includes(role.id) || role.id === guild.id)
            .map(role => role.permissions)
    ].filter(value => typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint');

    return permissionValues.some(value => (BigInt(value) & administrator) !== 0n);
};

const channelSetting = key => key.toLowerCase().includes('channel') || key.toLowerCase().includes('category');

const replaceChannelNames = (value, channels, key = '') => {
    if (Array.isArray(value)) return value.map(item => replaceChannelNames(item, channels, key));
    if (!value || typeof value !== 'object') {
        if (!channelSetting(key) || typeof value !== 'string') return value;
        return channels.find(channel => channel.id === value || channel.name === value)?.id || value;
    }
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        replaceChannelNames(childValue, channels, childKey)
    ]));
};

const readConfig = (file) => {
    const config = JSON.parse(fs.readFileSync(path.join(root, dashboardFiles[file]), 'utf8'));
    if (file === 'config.json') {
        delete config.general;
        delete config.database;
    }
    return config;
};

app.get('/auth/login', (request, response) => {
    const clientId = process.env.DISCORD_DASHBOARD_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
    const redirectUri = getDashboardRedirectUri(request);
    if (!clientId || !process.env.DISCORD_DASHBOARD_CLIENT_SECRET) {
        return response.status(503).send('Dashboard OAuth is not configured. Set the dashboard variables in .env.');
    }
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'identify guilds.members.read'
    });
    return response.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

app.get('/auth/callback', async (request, response) => {
    try {
        if (!request.query.code) return response.status(400).send('Missing OAuth code.');
        const clientId = process.env.DISCORD_DASHBOARD_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
        const redirectUri = getDashboardRedirectUri(request);
        const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: process.env.DISCORD_DASHBOARD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: request.query.code,
                redirect_uri: redirectUri
            })
        });
        if (!tokenResponse.ok) throw new Error('OAuth token exchange failed.');
        const token = await tokenResponse.json();
        const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${token.access_token}` }
        });
        const user = await userResponse.json();
        const guild = await discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}`);
        const member = await discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}/members/${user.id}`);
        const roles = await discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}/roles`);
        if (!isAdmin({ ...member, user }, guild, roles)) return response.status(403).send('Only Discord server administrators can access this dashboard.');
        const sessionToken = createSession({ id: user.id, username: user.global_name || user.username, avatar: user.avatar });
        response.setHeader('Set-Cookie', `sudo_dashboard_session=${sessionToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
        return response.redirect('/');
    } catch (error) {
        logger.error(error);
        return response.status(502).send('Discord login could not be completed.');
    }
});

app.post('/auth/logout', (request, response) => {
    const token = getCookie(request, 'sudo_dashboard_session');
    if (token) sessions.delete(token);
    response.setHeader('Set-Cookie', 'sudo_dashboard_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return response.status(204).end();
});

app.get('/api/session', (request, response) => {
    const token = getCookie(request, 'sudo_dashboard_session');
    const session = token && sessions.get(token);
    return response.json({ authenticated: Boolean(session && session.expiresAt > Date.now()), user: session?.user || null });
});

app.get('/api/configs', requireAdmin, (request, response) => response.json(
    Object.keys(dashboardFiles).map(file => ({ file, config: readConfig(file) }))
));

app.get('/api/config/:file', requireAdmin, (request, response) => {
    if (!dashboardFiles[request.params.file]) return response.status(404).json({ error: 'Unknown configuration.' });
    return response.json(readConfig(request.params.file));
});

app.get('/api/discord-options', requireAdmin, async (request, response) => {
    const guild = await discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}/channels`);
    const roles = await discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}/roles`);
    const emojis = await discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}/emojis`);
    return response.json({
        channels: guild.filter(channel => channel.type === 0 || channel.type === 4).map(channel => ({ id: channel.id, name: channel.name, type: channel.type })).sort((a, b) => a.name.localeCompare(b.name)),
        roles: roles.filter(role => role.name !== '@everyone').map(role => role.name).sort(),
        emojis: emojis.filter(emoji => emoji.name).map(emoji => ({
            name: emoji.name,
            value: `:${emoji.name}:`,
            label: `${emoji.name}${emoji.animated ? ' (animated)' : ''}`
        })).sort((a, b) => a.name.localeCompare(b.name))
    });
});

app.get('/api/server-status', requireAdmin, async (request, response) => {
    const guild = await discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}?with_counts=true`);
    const memberCount = guild.approximate_member_count || guild.member_count || 0;
    await recordDailyMemberCount(memberCount);
    return response.json({
        name: guild.name,
        icon: guild.icon,
        memberCount,
        onlineCount: guild.approximate_presence_count || 0,
        daily: await getDailyStats(),
        updatedAt: Date.now()
    });
});

app.put('/api/config/:file', requireAdmin, async (request, response) => {
    const file = request.params.file;
    if (!dashboardFiles[file]) return response.status(404).json({ error: 'Unknown configuration.' });
    if (request.body === null || typeof request.body !== 'object') return response.status(400).json({ error: 'Configuration must be JSON.' });
    const config = structuredClone(request.body);
    if (file === 'config.json') {
        delete config.general;
        delete config.database;
        const channels = await discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}/channels`);
        Object.assign(config, replaceChannelNames(config, channels.filter(channel => channel.type === 0 || channel.type === 4)));
        for (const value of Object.values(config)) {
            if (value && typeof value === 'object' && !Array.isArray(value) && !Object.hasOwn(value, 'enabled')) {
                value.enabled = true;
            }
        }
    }
    const target = path.join(root, dashboardFiles[file]);
    fs.writeFileSync(target, `${JSON.stringify(config, null, 4)}\n`);
    if (file === 'config.json') UpdateConfig(config);
    logger.info(`Dashboard configuration saved: ${file} by ${request.dashboardUser.username}`);
    return response.json({ saved: true, config });
});

export const InitDashboard = () => {
    logger = CreateLogger('Dashboard');
    const port = Number(process.env.DISCORD_DASHBOARD_PORT || 3000);
    app.listen(port, () => logger.info(`Dashboard available on port ${port}`));
};
