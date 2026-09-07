import React, { useEffect, useMemo, useState } from 'react';

const periods = ['week', 'month', 'year', 'all'];

function startDate(period) {
    if (period === 'all') return null;
    const date = new Date();
    const days = { day: 1, week: 7, month: 30, year: 365 }[period];
    date.setDate(date.getDate() - days + 1);
    return date.toISOString().slice(0, 10);
}

function Chart({ title, data, color, totalMode = 'sum' }) {
    const points = data.length ? data : [{ label: 'No data', value: 0 }];
    const max = Math.max(...points.map(point => point.value), 1);
    const total = totalMode === 'latest'
        ? points[points.length - 1].value
        : points.reduce((sum, point) => sum + point.value, 0);
    const width = 720;
    const height = 220;
    const step = points.length === 1 ? width : width / (points.length - 1);
    const line = points.map((point, index) => `${index * step},${height - (point.value / max) * (height - 24)}`).join(' ');
    return <section className="card chart-card">
        <div className="chart-heading"><h3>{title}</h3><strong>{total.toLocaleString()}</strong></div>
        <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
            <polyline points={line} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point, index) => <circle key={`${point.label}-${index}`} cx={index * step} cy={height - (point.value / max) * (height - 24)} r="4" fill={color} />)}
        </svg>
        <div className="chart-labels"><span>{points[0].label}</span><span>{points[points.length - 1].label}</span></div>
    </section>;
}

function formatCountdown(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${minutes}m ${seconds}s`;
}

export function ServerStatus({ status, onRefresh }) {
    const [period, setPeriod] = useState('week');
    const [now, setNow] = useState(Date.now());
    const [refreshing, setRefreshing] = useState(false);
    const nextUpdate = new Date();
    nextUpdate.setHours(1, 0, 0, 0);
    if (nextUpdate.getTime() <= now) nextUpdate.setDate(nextUpdate.getDate() + 1);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const refreshNow = async () => {
        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setRefreshing(false);
        }
    };

    const data = useMemo(() => {
        const cutoff = startDate(period);
        return Object.entries(status.daily)
            .filter(([date]) => !cutoff || date >= cutoff)
            .map(([date, values]) => ({ date, ...values }));
    }, [period, status.daily]);
    const toChart = key => data.map(day => ({ label: day.date.slice(5), value: day[key] || 0 }));
    return <div className="status-page">
        <div className="status-controls">{periods.map(option => <button key={option} className={`button ${period === option ? 'primary' : 'ghost'}`} onClick={() => setPeriod(option)}>{option}</button>)}<span className="status-next-update">Next update at 01:00 ({formatCountdown(nextUpdate.getTime() - now)})</span><button className="button ghost" onClick={refreshNow} disabled={refreshing}>{refreshing ? 'Updating…' : 'Grab data now'}</button></div>
        <div className="status-cards"><div className="card stat-card"><span>Members</span><strong>{status.memberCount.toLocaleString()}</strong></div><div className="card stat-card"><span>Online now</span><strong>{status.onlineCount.toLocaleString()}</strong></div><div className="card stat-card"><span>Tracked days</span><strong>{data.length}</strong></div></div>
        <Chart title="Messages" data={toChart('messages')} color="#d32b52" />
        <Chart title="Member count" data={toChart('member_count')} color="#65b7e8" totalMode="latest" />
        <Chart title="Members joined" data={toChart('joins')} color="#e56883" />
        <Chart title="Members left" data={toChart('leaves')} color="#9b9da8" />
    </div>;
}
