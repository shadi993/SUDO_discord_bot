import React from 'react';
import { Brand } from './Brand.jsx';
import { dashboardLayout } from '../layout.config.js';

export const labels = {
    'config.json': 'Configuration'
};

export function Sidebar({ configs, active, onSelect }) {
    const mainConfig = configs.find(({ file }) => file === 'config.json');
    const sections = mainConfig ? Object.keys(mainConfig.config) : [];
    const tabs = sections
        .sort((a, b) => {
            const order = Object.keys(dashboardLayout.sections);
            return (order.indexOf(a) < 0 ? order.length : order.indexOf(a)) - (order.indexOf(b) < 0 ? order.length : order.indexOf(b));
        })
        .map(section => ({ file: 'config.json', section, label: dashboardLayout.sections[section]?.label || section.replaceAll('_', ' ') }));
    return (
        <aside className="sidebar">
            <Brand />
            <p className="eyebrow">CONFIGURATION</p>
            <nav>
                <button className={`nav-button ${active.file === '__status__' ? 'active' : ''}`} onClick={() => onSelect('__status__', null)}>
                    Server status
                </button>
                {tabs.map(tab => (
                    <button
                        className={`nav-button ${active.file === tab.file && active.section === tab.section ? 'active' : ''}`}
                        key={`${tab.file}:${tab.section || 'root'}`}
                        onClick={() => onSelect(tab.file, tab.section)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
            <div className="sidebar-footer"><span className="status-dot" /> Bot control online</div>
        </aside>
    );
}
