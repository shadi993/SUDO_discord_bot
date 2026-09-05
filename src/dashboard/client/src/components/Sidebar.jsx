import React from 'react';
import { Brand } from './Brand.jsx';

export const labels = {
    'config.json': 'Main config',
    'honeypot.json': 'Honeypot',
    'persistentMessages.json': 'Persistent messages',
    'roles.json': 'Roles',
    'thresholdMessages.json': 'Threshold messages'
};

export function Sidebar({ configs, active, onSelect }) {
    const mainConfig = configs.find(({ file }) => file === 'config.json');
    const sections = mainConfig ? Object.keys(mainConfig.config) : [];
    const tabs = [
        ...sections.map(section => ({ file: 'config.json', section, label: section.replaceAll('_', ' ') })),
        ...configs.filter(({ file }) => file !== 'config.json').map(({ file }) => ({ file, section: null, label: labels[file] }))
    ];
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
