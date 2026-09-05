import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { ConfigEditor } from './components/ConfigEditor.jsx';
import { labels, Sidebar } from './components/Sidebar.jsx';
import { LoginScreen } from './components/LoginScreen.jsx';
import { ServerStatus } from './components/ServerStatus.jsx';

export function Dashboard() {
    const [session, setSession] = useState(null);
    const [configs, setConfigs] = useState([]);
    const [options, setOptions] = useState({ channels: [], roles: [] });
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

    return <div className="shell">
        <Sidebar configs={configs} active={active} onSelect={(file, section) => setActive({ file, section })} />
        <main className="main">
            <header className="topbar"><div><p className="eyebrow">ADMIN CONSOLE</p><h2>{active.file === '__status__' ? 'Server status' : active.file === 'config.json' ? active.section?.replaceAll('_', ' ') : labels[active.file]}</h2></div><div className="account"><span>{session.user.username}</span><button className="button ghost" onClick={async () => { await api('/auth/logout', { method: 'POST' }); location.reload(); }}>Log out</button></div></header>
            <section className="content">{active.file === '__status__' && status ? <ServerStatus status={status} /> : current && <ConfigEditor key={`${active.file}:${active.section || 'root'}`} config={current} section={active.section} options={options} onSave={save} />}{error && <p className="error">{error}</p>}</section>
        </main>
        {notice && <div className="toast">{notice}</div>}
    </div>;
}
