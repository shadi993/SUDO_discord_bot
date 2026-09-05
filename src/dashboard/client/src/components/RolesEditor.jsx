import React from 'react';

const buttonStyles = ['Primary', 'Secondary', 'Success', 'Danger', 'Link'];

function TextField({ label, value, onChange, type = 'text' }) {
    return <div className="field">
        <label>{label}</label>
        <input type={type} value={value ?? ''} onChange={event => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} />
    </div>;
}

function RoleOption({ option, options, onChange, onDelete }) {
    const update = (key, value) => onChange({ ...option, [key]: value });
    return <section className="card nested-card">
        <div className="option-heading">
            <h3>Role option</h3>
            <button className="button danger" type="button" onClick={onDelete}>Delete option</button>
        </div>
        <TextField label="Description" value={option.description} onChange={value => update('description', value)} />
        <div className="field"><label>Role name</label><select value={option.role_name || ''} onChange={event => update('role_name', event.target.value)}>
            <option value="">Select a Discord role</option>
            {options.roles.map(role => <option key={role}>{role}</option>)}
        </select></div>
        <TextField label="Button emoji" value={option.button_emoji} onChange={value => update('button_emoji', value)} />
        <TextField label="Button text" value={option.button_text} onChange={value => update('button_text', value)} />
        <div className="field"><label>Button style</label><select value={option.button_style || 'Secondary'} onChange={event => update('button_style', event.target.value)}>
            {buttonStyles.map(style => <option key={style}>{style}</option>)}
        </select></div>
        <div className="field"><label>Required role</label><select value={option.required_role || ''} onChange={event => update('required_role', event.target.value)}>
            <option value="">No required role</option>
            {options.roles.map(role => <option key={role}>{role}</option>)}
        </select></div>
        <div className="field"><label>Required level</label><input type="number" min="0" value={option.requirements?.level ?? ''} onChange={event => update('requirements', { ...(option.requirements || {}), level: event.target.value === '' ? undefined : Number(event.target.value) })} /></div>
    </section>;
}

export function RolesEditor({ value, options, onChange }) {
    const emit = panels => onChange(panels.map((panel, index) => ({ ...panel, id: index })));
    const updatePanel = (index, panel) => emit(value.map((item, itemIndex) => itemIndex === index ? panel : item));
    const addPanel = () => emit([...value, { channel_name: '', title: '', options: [] }]);
    return <div className="array-editor">
        {value.map((panel, index) => <section className="card" key={`role-panel-${index}`}>
            <div className="option-heading"><h3>Role panel {index}</h3><button className="button danger" type="button" onClick={() => emit(value.filter((_, itemIndex) => itemIndex !== index))}>Delete panel</button></div>
            <div className="field"><label>Channel name</label><select value={panel.channel_name || ''} onChange={event => updatePanel(index, { ...panel, channel_name: event.target.value, id: index })}>
                <option value="">Select a Discord channel</option>
                {options.channels.map(channel => <option key={channel}>{channel}</option>)}
            </select></div>
            <TextField label="Title" value={panel.title} onChange={title => updatePanel(index, { ...panel, title, id: index })} />
            <div className="field switch"><label>Exclusive group</label><input type="checkbox" checked={Boolean(panel.exclusive_group)} onChange={event => updatePanel(index, { ...panel, exclusive_group: event.target.checked, id: index })} /></div>
            {(panel.options || []).map((option, optionIndex) => <RoleOption key={`${index}-${optionIndex}`} option={option} options={options} onChange={nextOption => updatePanel(index, { ...panel, id: index, options: panel.options.map((item, itemIndex) => itemIndex === optionIndex ? nextOption : item) })} onDelete={() => updatePanel(index, { ...panel, id: index, options: panel.options.filter((_, itemIndex) => itemIndex !== optionIndex) })} />)}
            <button className="button ghost" type="button" onClick={() => updatePanel(index, { ...panel, id: index, options: [...(panel.options || []), { description: '', role_name: '', button_text: '', button_emoji: '', button_style: 'Secondary' }] })}>Add option</button>
        </section>)}
        <button className="button ghost" type="button" onClick={addPanel}>Add role panel</button>
    </div>;
}
