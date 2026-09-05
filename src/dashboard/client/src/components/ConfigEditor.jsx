import React, { useEffect, useState } from 'react';
import { RolesEditor } from './RolesEditor.jsx';
import { BanEmojiEditor } from './BanEmojiEditor.jsx';

const pretty = value => value.replaceAll('_', ' ').replaceAll('-', ' ');

function RoleSelect({ value, options, onChange }) {
    return <select value={value || ''} onChange={event => onChange(event.target.value)}>
        <option value="">Select a Discord role</option>
        {options.roles.map(role => <option key={role} value={role}>{role}</option>)}
    </select>;
}

function Field({ name, value, root, options, roleField = false, onRefresh }) {
    const update = nextValue => {
        root[name] = nextValue;
        onRefresh();
    };
    if (typeof value === 'boolean') {
        return <div className="field switch"><label>{pretty(name)}</label><input type="checkbox" defaultChecked={value} onChange={event => update(event.target.checked)} /></div>;
    }
    if (Array.isArray(value)) {
        const choices = name.toLowerCase().includes('channel') ? options.channels : name === 'assign_on_join' || name.toLowerCase().includes('role') ? options.roles : [];
        if (choices.length && value.every(item => typeof item === 'string')) {
            return <div className="field"><label>{pretty(name)}</label><select multiple defaultValue={value} size={Math.min(Math.max(choices.length, 4), 8)} onChange={event => update([...event.target.selectedOptions].map(option => option.value))}>{choices.map(option => <option key={option}>{option}</option>)}</select></div>;
        }
        if (value.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
            return <section className="array-editor">
                {value.map((item, index) => <section className="card nested-card" key={`${name}-${index}`}>
                    <h3>{pretty(name)} {index + 1}</h3>
                    {Object.entries(item).map(([childName, childValue]) => <Field key={childName} name={childName} value={childValue} root={item} options={options} onRefresh={onRefresh} />)}
                </section>)}
                <button className="button ghost" onClick={() => {
                    const template = value[0] || { channel_name: '', threshold: 1, bot_message: '', enabled: false };
                    root[name] = [...value, Object.fromEntries(Object.keys(template).map(key => [key, typeof template[key] === 'boolean' ? false : typeof template[key] === 'number' ? 1 : '']))];
                    onRefresh();
                }}>Add message</button>
            </section>;
        }
        return <div className="field"><label>{pretty(name)}</label><textarea defaultValue={JSON.stringify(value, null, 2)} onChange={event => { try { update(JSON.parse(event.target.value)); } catch { /* Keep the last valid value until JSON is valid. */ } }} /></div>;
    }
    if (typeof value === 'object' && value !== null) {
        const isLevelRoles = name === 'roles' && Object.keys(value).every(key => /^\d+$/.test(key));
        const updateLevel = (oldLevel, nextLevel) => {
            if (!/^\d+$/.test(nextLevel) || (nextLevel !== oldLevel && nextLevel in value)) {
                onRefresh();
                return;
            }

            const entries = Object.entries(value).map(([level, role]) => [level === oldLevel ? nextLevel : level, role]);
            Object.keys(value).forEach(level => delete value[level]);
            entries.forEach(([level, role]) => { value[level] = role; });
            onRefresh();
        };
        return <section className="card nested-card"><h3>{pretty(name)}</h3>{Object.entries(value).map(([childName, childValue]) => <div className="level-row" key={childName}>
            {isLevelRoles ? <input className="level-number" type="number" min="0" defaultValue={childName} aria-label={`Level number for ${childValue}`} onBlur={event => updateLevel(childName, event.target.value)} /> : <label>{pretty(childName)}</label>}
            {isLevelRoles ? <RoleSelect value={childValue} options={options} onChange={nextValue => { value[childName] = nextValue; onRefresh(); }} /> : <Field name={childName} value={childValue} root={value} options={options} roleField={roleField} onRefresh={onRefresh} />}
            {isLevelRoles && <button className="button danger" type="button" onClick={() => { delete value[childName]; onRefresh(); }}>Delete</button>}
        </div>)}{isLevelRoles && <button className="button ghost" onClick={() => { const level = window.prompt('New level number:'); if (level && /^\d+$/.test(level) && !(level in value)) { value[level] = ''; onRefresh(); } }}>Add level</button>}</section>;
    }
    const isChannel = name.toLowerCase().includes('channel') || name.toLowerCase().includes('category');
    const isRole = roleField || name.toLowerCase().includes('role') || name.toLowerCase().includes('moderator');
    const choices = isChannel ? options.channels : isRole ? options.roles : [];
    return <div className="field"><label>{pretty(name)}</label>{choices.length ? (isRole ? <RoleSelect value={value} options={options} onChange={update} /> : <select value={value || ''} onChange={event => update(event.target.value)}>{choices.map(option => <option key={option}>{option}</option>)}</select>) : <input type={typeof value === 'number' ? 'number' : 'text'} defaultValue={value ?? ''} onChange={event => update(typeof value === 'number' ? Number(event.target.value) : event.target.value)} />}</div>;
}

export function ConfigEditor({ config, options, section, onSave }) {
    const [draft, setDraft] = useState(() => structuredClone(config.config));
    useEffect(() => setDraft(structuredClone(config.config)), [config]);
    const sectionConfig = section && config.file === 'config.json' ? draft[section] : draft;
    if (section && config.file === 'config.json' && (!sectionConfig || typeof sectionConfig !== 'object' || Array.isArray(sectionConfig))) {
        return <p className="error">This configuration section could not be loaded.</p>;
    }
    if (config.file === 'roles.json') {
        return <><RolesEditor value={draft} options={options} onChange={nextValue => setDraft(nextValue)} /><div className="save-row"><button className="button primary" onClick={() => onSave(draft)}>Save changes</button></div></>;
    }
    if (section === 'ban_emoji' && config.file === 'config.json') {
        return <><BanEmojiEditor value={draft[section]} options={options} onChange={nextValue => setDraft({ ...draft, [section]: nextValue })} /><p className="muted config-note">Configure emoji names or Unicode emojis that the bot should remove and log.</p><div className="save-row"><button className="button primary" onClick={() => onSave(draft)}>Save changes</button></div></>;
    }
    const entries = Object.entries(sectionConfig);
    const refresh = () => setDraft(structuredClone(draft));
    return <><section className="card"><h3>{section?.replaceAll('_', ' ') || 'Settings'}</h3>{entries.map(([name, value]) => <Field key={name} name={name} value={value} root={sectionConfig} options={options} roleField={section === 'leveling' && name === 'roles'} onRefresh={refresh} />)}</section>{section === 'moderation' && <p className="muted config-note">Used for logging <code>/kick</code>, <code>/ban</code>, <code>/info</code>, and <code>/warn</code> actions.</p>}<div className="save-row"><button className="button primary" onClick={() => onSave(draft)}>Save changes</button></div></>;
}
