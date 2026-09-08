import React, { useEffect, useState } from 'react';
import { RolesEditor } from './RolesEditor.jsx';
import { BanEmojiEditor } from './BanEmojiEditor.jsx';
import { getSectionLayout } from '../layout.config.js';

const pretty = value => value.replaceAll('_', ' ').replaceAll('-', ' ');

function RoleSelect({ value, options, onChange }) {
    return <select value={value || ''} onChange={event => onChange(event.target.value)}>
        <option value="">Select a Discord role</option>
        {options.roles.map(role => <option key={role} value={role}>{role}</option>)}
    </select>;
}

function channelValue(value, options) {
    return options.channels.find(channel => channel.id === value || channel.name === value)?.id || value || '';
}

function channelOptionLabel(option) {
    return option.name;
}

function channelChoices(options, type, currentValue) {
    const expectedType = type === 'category' ? 4 : 0;
    const choices = options.channels.filter(channel => channel.type === expectedType);
    const rawValue = typeof currentValue === 'string' ? currentValue : currentValue?.id || '';
    const currentId = options.channels.find(channel => channel.id === rawValue || channel.name === rawValue)?.id || rawValue;
    if (currentId && !choices.some(channel => channel.id === currentId)) {
        const configured = options.channels.find(channel => channel.id === currentId);
        choices.unshift(configured || {id: currentId, name: currentId, type: expectedType});
    }
    return choices;
}

function MultiChoice({ value, choices, isChannel, onChange }) {
    const selected = new Set((value || []).map(item => isChannel ? channelValue(item, { channels: choices }) : item));
    const toggle = option => {
        const optionValue = isChannel ? option.id : option;
        const next = new Set(selected);
        if (next.has(optionValue)) next.delete(optionValue);
        else next.add(optionValue);
        onChange([...next]);
    };

    return <div className="multi-choice" role="group">
        {choices.map(option => {
            const optionValue = isChannel ? option.id : option;
            return <button
                className={`multi-choice-option ${selected.has(optionValue) ? 'selected' : ''}`}
                key={optionValue}
                type="button"
                aria-pressed={selected.has(optionValue)}
                onClick={() => toggle(option)}
            >
                {isChannel ? channelOptionLabel(option) : option}
            </button>;
        })}
    </div>;
}

function Field({ name, value, root, options, roleField = false, definition = {}, onRefresh }) {
    const update = nextValue => {
        root[name] = nextValue;
        onRefresh();
    };
    const fieldType = definition.type || (typeof value === 'boolean' ? 'toggle' : undefined);
    if (fieldType === 'toggle') {
        return <div className="field switch"><label>{pretty(name)}</label><input type="checkbox" defaultChecked={value} onChange={event => update(event.target.checked)} /></div>;
    }
    if (fieldType === 'select') {
        const choices = definition.options || [];
        return <div className="field"><label>{definition.label || pretty(name)}</label><select value={value || ''} onChange={event => update(event.target.value)}>
            <option value="">Select an option</option>
            {choices.map(option => <option key={option} value={option}>{option}</option>)}
        </select></div>;
    }
    if (fieldType === 'channels' || fieldType === 'roles') {
        const choices = fieldType === 'channels' ? channelChoices(options, 'channel') : options.roles;
        return <div className="field"><label>{pretty(name)}</label><MultiChoice value={value} choices={choices} isChannel={fieldType === 'channels'} onChange={update} /></div>;
    }
    if (Array.isArray(value)) {
        const choices = name.toLowerCase().includes('channel') ? channelChoices(options, 'channel', value[0]) : name === 'assign_on_join' || name.toLowerCase().includes('role') ? options.roles : [];
        if (choices.length && value.every(item => typeof item === 'string')) {
            const isChannel = name.toLowerCase().includes('channel');
            return <div className="field"><label>{pretty(name)}</label><MultiChoice value={value} choices={choices} isChannel={isChannel} onChange={update} /></div>;
        }
        if (value.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
            return <section className="array-editor">
                {value.map((item, index) => <section className="card nested-card" key={`${name}-${index}`}>
                    <h3>{pretty(name)} {index + 1}</h3>
                    {Object.entries(item).map(([childName, childValue]) => <Field key={childName} name={childName} value={childValue} root={item} options={options} definition={definition.fields?.[childName] || {}} onRefresh={onRefresh} />)}
                    <button className="button danger" type="button" onClick={() => { root[name] = value.filter((_, itemIndex) => itemIndex !== index); onRefresh(); }}>Delete {definition.itemLabel || pretty(name)}</button>
                </section>)}
                <button className="button ghost" onClick={() => {
                    const template = value[0] || definition.template || Object.fromEntries(Object.entries(definition.fields || {}).map(([key, field]) => [key, field.type === 'toggle' ? false : field.type === 'number' ? 0 : field.type === 'frames' ? [] : '']));
                    root[name] = [...value, Object.fromEntries(Object.keys(template).map(key => [key, typeof template[key] === 'boolean' ? false : typeof template[key] === 'number' ? 1 : '']))];
                    onRefresh();
                }}>{definition.addLabel || 'Add entry'}</button>
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
    const isChannel = definition.type === 'channel' || name.toLowerCase().includes('channel') || name.toLowerCase().includes('category');
    const isRole = definition.type === 'role' || roleField || name.toLowerCase().includes('role') || name.toLowerCase().includes('moderator');
    const choices = isChannel
        ? channelChoices(options, definition.type === 'category' ? 'category' : 'channel', value)
        : isRole ? options.roles : [];
    const selectedChannel = isChannel ? channelValue(value, options) : '';
    return <div className="field"><label>{definition.label || pretty(name)}</label>{choices.length ? (isRole ? <RoleSelect value={value} options={options} onChange={update} /> : <select value={selectedChannel} onChange={event => update(event.target.value)}>{choices.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>) : <input type={definition.type === 'number' || typeof value === 'number' ? 'number' : 'text'} value={value ?? ''} onChange={event => update(definition.type === 'number' || typeof value === 'number' ? Number(event.target.value) : event.target.value)} />}</div>;
}

export function ConfigEditor({ config, options, section, onSave }) {
    const [draft, setDraft] = useState(() => structuredClone(config.config));
    useEffect(() => setDraft(structuredClone(config.config)), [config.config]);
    const sectionConfig = section && config.file === 'config.json' ? draft[section] : draft;
    if (section && config.file === 'config.json' && (!sectionConfig || typeof sectionConfig !== 'object' || Array.isArray(sectionConfig))) {
        return <p className="error">This configuration section could not be loaded.</p>;
    }
    const layout = getSectionLayout(section);
    if (layout.fields.panels?.editor === 'roles' && config.file === 'config.json') {
        return <><RolesEditor value={draft.roles.panels || []} options={options} onChange={nextValue => setDraft({ ...draft, roles: { ...draft.roles, panels: nextValue } })} /><div className="save-row"><button className="button primary" onClick={() => onSave(draft)}>Save changes</button></div></>;
    }
    if (section === 'ban_emoji' && config.file === 'config.json') {
        return <><BanEmojiEditor value={draft[section]} options={options} onChange={nextValue => setDraft({ ...draft, [section]: nextValue })} /><p className="muted config-note">Configure emoji names or Unicode emojis that the bot should remove and log.</p><div className="save-row"><button className="button primary" onClick={() => onSave(draft)}>Save changes</button></div></>;
    }
    const entries = Object.entries(sectionConfig);
    const refresh = () => setDraft(previousDraft => structuredClone(previousDraft));
    return <><section className="card"><h3>{layout.label || section?.replaceAll('_', ' ') || 'Settings'}</h3>{entries.map(([name, value]) => <Field key={name} name={name} value={value} root={sectionConfig} options={options} definition={layout.fields[name] || {}} roleField={section === 'leveling' && name === 'roles'} onRefresh={refresh} />)}</section>{section === 'moderation' && <p className="muted config-note">Used for logging <code>/kick</code>, <code>/ban</code>, <code>/info</code>, and <code>/warn</code> actions.</p>}<div className="save-row"><button className="button primary" onClick={() => onSave(draft)}>Save changes</button></div></>;
}
