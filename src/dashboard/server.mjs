import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { PermissionFlagsBits } from 'discord.js';
import { UpdateConfig } from '../core/config.mjs';
import { CreateLogger } from '../core/logger.mjs';
import { getDailyStats } from './stats.mjs';

let logger;
const app = express();
const sessions = new Map();
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
const dashboardFiles = {
    'config.json': 'config.json',
    'honeypot.json': 'honeypot.json',
    'persistentMessages.json': 'persistentMessages.json',
    'roles.json': 'roles.json',
    'thresholdMessages.json': 'thresholdMessages.json'
};

app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(root, 'src/dashboard/dist')));

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

const isAdmin = (member, guild) => guild.owner_id === member.user.id
    || (BigInt(member.permissions) & BigInt(PermissionFlagsBits.Administrator)) !== 0n;

const readConfig = (file) => JSON.parse(fs.readFileSync(path.join(root, dashboardFiles[file]), 'utf8'));

app.get('/auth/login', (_request, response) => {
    const clientId = process.env.DISCORD_DASHBOARD_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_DASHBOARD_REDIRECT_URI || 'http://localhost:3000/auth/callback';
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
        const redirectUri = process.env.DISCORD_DASHBOARD_REDIRECT_URI || 'http://localhost:3000/auth/callback';
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
        if (!isAdmin({ ...member, user }, guild)) return response.status(403).send('Only Discord server administrators can access this dashboard.');
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
        channels: guild.filter(channel => channel.type === 0).map(channel => channel.name).sort(),
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
    return response.json({
        name: guild.name,
        icon: guild.icon,
        memberCount: guild.approximate_member_count || guild.member_count || 0,
        onlineCount: guild.approximate_presence_count || 0,
        daily: getDailyStats()
    });
});

app.put('/api/config/:file', requireAdmin, (request, response) => {
    const file = request.params.file;
    if (!dashboardFiles[file]) return response.status(404).json({ error: 'Unknown configuration.' });
    if (request.body === null || typeof request.body !== 'object') return response.status(400).json({ error: 'Configuration must be JSON.' });
    const target = path.join(root, dashboardFiles[file]);
    fs.writeFileSync(target, `${JSON.stringify(request.body, null, 4)}\n`);
    if (file === 'config.json') UpdateConfig(request.body);
    logger.info(`Dashboard configuration saved: ${file} by ${request.dashboardUser.username}`);
    return response.json({ saved: true, config: request.body });
});

export const InitDashboard = () => {
    logger = CreateLogger('Dashboard');
    const port = Number(process.env.DISCORD_DASHBOARD_PORT || 3000);
    app.listen(port, () => logger.info(`Dashboard available at http://localhost:${port}`));
};
