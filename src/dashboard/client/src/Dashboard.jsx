import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { ConfigEditor } from './components/ConfigEditor.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { LoginScreen } from './components/LoginScreen.jsx';
import { ServerStatus } from './components/ServerStatus.jsx';

export function Dashboard() {
    const [session, setSession] = useState(null);
    const [configs, setConfigs] = useState([]);
    const [options, setOptions] = useState({ channels: [], roles: [], emojis: [] });
    const [active, setActive] = useState({ file: null, section: null });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [status, setStatus] = useState(null);

    useEffect(() => {
        api('/api/session')
            .then(nextSession => {
                if (!nextSession.authenticated) return null;
                setSession(nextSession);
                return Promise.all([api('/api/configs'), api('/api/discord-options'), api('/api/server-status')]);
            })
            .then(result => {
                if (!result) return;
                const [nextConfigs, nextOptions, nextStatus] = result;
                setConfigs(nextConfigs);
                setOptions(nextOptions);
                const mainConfig = nextConfigs.find(config => config.file === 'config.json');
                setStatus(nextStatus);
                setActive({ file: '__status__', section: null });
            })
            .catch(nextError => setError(nextError.message));
    }, []);

    if (!session) return <LoginScreen error={error} />;
    const current = configs.find(config => config.file === active.file);
    const save = async draft => {
        try {
            const result = await api(`/api/config/${active.file}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
            setConfigs(configs.map(config => config.file === active.file ? { ...config, config: result.config } : config));
            setNotice('Configuration saved');
            setTimeout(() => setNotice(''), 2500);
        } catch (saveError) {
            setError(saveError.message);
        }
    };

    const exportConfig = () => {
        const config = configs.find(item => item.file === 'config.json')?.config || {};
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([JSON.stringify(config, null, 4)], { type: 'application/json' }));
        link.download = 'config.json';
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const importConfig = event => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const imported = JSON.parse(reader.result);
                const result = await api('/api/config/config.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(imported) });
                setConfigs([{ file: 'config.json', config: result.config }]);
                setNotice('Configuration imported');
            } catch (importError) {
                setError(importError.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    return <div className="shell">
        <Sidebar configs={configs} active={active} onSelect={(file, section) => setActive({ file, section })} />
        <main className="main">
            <header className="topbar"><div><p className="eyebrow">ADMIN CONSOLE</p><h2>{active.file === '__status__' ? 'Server status' : active.section?.replaceAll('_', ' ')}</h2></div><div className="account"><span>{session.user.username}</span><button className="button ghost" onClick={exportConfig}>Export config</button><label className="button ghost" htmlFor="config-import">Import config</label><input id="config-import" type="file" accept="application/json" hidden onChange={importConfig} /><button className="button ghost" onClick={async () => { await api('/auth/logout', { method: 'POST' }); location.reload(); }}>Log out</button></div></header>
            <section className="content">{active.file === '__status__' && status ? <ServerStatus status={status} /> : current && <ConfigEditor key={`${active.file}:${active.section || 'root'}`} config={current} section={active.section} options={options} onSave={save} />}{error && <p className="error">{error}</p>}</section>
        </main>
        {notice && <div className="toast">{notice}</div>}
    </div>;
}
