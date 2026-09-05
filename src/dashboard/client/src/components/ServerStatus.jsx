import React, { useMemo, useState } from 'react';

const periods = ['day', 'week', 'month', 'year', 'all'];

function startDate(period) {
    if (period === 'all') return null;
    const date = new Date();
    const days = { day: 1, week: 7, month: 30, year: 365 }[period];
    date.setDate(date.getDate() - days + 1);
    return date.toISOString().slice(0, 10);
}

function Chart({ title, data, color }) {
    const points = data.length ? data : [{ label: 'No data', value: 0 }];
    const max = Math.max(...points.map(point => point.value), 1);
    const width = 720;
    const height = 220;
    const step = points.length === 1 ? width : width / (points.length - 1);
    const line = points.map((point, index) => `${index * step},${height - (point.value / max) * (height - 24)}`).join(' ');
    return <section className="card chart-card">
        <div className="chart-heading"><h3>{title}</h3><strong>{points.reduce((sum, point) => sum + point.value, 0).toLocaleString()}</strong></div>
        <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
            <polyline points={line} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point, index) => <circle key={`${point.label}-${index}`} cx={index * step} cy={height - (point.value / max) * (height - 24)} r="4" fill={color} />)}
        </svg>
        <div className="chart-labels"><span>{points[0].label}</span><span>{points[points.length - 1].label}</span></div>
    </section>;
}

export function ServerStatus({ status }) {
    const [period, setPeriod] = useState('week');
    const data = useMemo(() => {
        const cutoff = startDate(period);
        return Object.entries(status.daily)
            .filter(([date]) => !cutoff || date >= cutoff)
            .map(([date, values]) => ({ date, ...values }));
    }, [period, status.daily]);
    const toChart = key => data.map(day => ({ label: day.date.slice(5), value: day[key] || 0 }));
    return <div className="status-page">
        <div className="status-controls">{periods.map(option => <button key={option} className={`button ${period === option ? 'primary' : 'ghost'}`} onClick={() => setPeriod(option)}>{option}</button>)}</div>
        <div className="status-cards"><div className="card stat-card"><span>Members</span><strong>{status.memberCount.toLocaleString()}</strong></div><div className="card stat-card"><span>Online now</span><strong>{status.onlineCount.toLocaleString()}</strong></div><div className="card stat-card"><span>Tracked days</span><strong>{data.length}</strong></div></div>
        <Chart title="Messages" data={toChart('messages')} color="#d32b52" />
        <Chart title="Members joined" data={toChart('joins')} color="#e56883" />
        <Chart title="Members left" data={toChart('leaves')} color="#9b9da8" />
    </div>;
}
