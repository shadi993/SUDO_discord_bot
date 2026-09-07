import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { DashboardDailyStatDboEntity } from '../core/database.mjs';

const today = () => new Date().toISOString().slice(0, 10);

const legacyStatsPath = path.join(
    path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..'),
    'data',
    'dashboard-stats.json'
);

export const migrateLegacyStats = async () => {
    try {
        const stats = JSON.parse(fs.readFileSync(legacyStatsPath, 'utf8'));
        for (const [date, values] of Object.entries(stats.days || {})) {
            await DashboardDailyStatDboEntity.findOrCreate({
                where: { date },
                defaults: {
                    messages: values.messages || 0,
                    joins: values.joins || 0,
                    leaves: values.leaves || 0,
                    member_count: values.member_count || 0,
                },
            });
        }
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
};

export const recordDailyStat = async type => {
    const date = today();
    const [dailyStat] = await DashboardDailyStatDboEntity.findOrCreate({
        where: { date },
        defaults: { messages: 0, joins: 0, leaves: 0 },
    });
    await dailyStat.increment(type);
};

export const recordDailyMemberCount = async memberCount => {
    const date = today();
    const [dailyStat] = await DashboardDailyStatDboEntity.findOrCreate({
        where: { date },
        defaults: { messages: 0, joins: 0, leaves: 0, member_count: memberCount },
    });
    if (dailyStat.member_count !== memberCount) {
        await dailyStat.update({ member_count: memberCount });
    }
};

export const getDailyStats = async () => {
    const rows = await DashboardDailyStatDboEntity.findAll({ order: [['date', 'ASC']] });
    return Object.fromEntries(rows.map(row => [row.date, {
        messages: row.messages,
        joins: row.joins,
        leaves: row.leaves,
        member_count: row.member_count,
    }]));
};
