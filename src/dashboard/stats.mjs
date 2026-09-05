import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
const statsPath = path.join(root, 'data', 'dashboard-stats.json');

const today = () => new Date().toISOString().slice(0, 10);

const readStats = () => {
    try {
        return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return { days: {} };
    }
};

const writeStats = stats => {
    fs.mkdirSync(path.dirname(statsPath), { recursive: true });
    fs.writeFileSync(statsPath, `${JSON.stringify(stats, null, 2)}\n`);
};

export const recordDailyStat = type => {
    const stats = readStats();
    const date = today();
    stats.days[date] ||= { messages: 0, joins: 0, leaves: 0 };
    stats.days[date][type] += 1;
    writeStats(stats);
};

export const getDailyStats = () => readStats().days;
