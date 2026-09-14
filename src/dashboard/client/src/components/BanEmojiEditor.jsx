import React from 'react';

function EmojiInput({ value, onChange }) {
    return <div className="emoji-input">
        <input type="text" value={value || ''} placeholder="e.g. :pregnant_man: or 🫄" onChange={event => onChange(event.target.value)} />
    </div>;
}

export function BanEmojiEditor({ value, options, onChange }) {
    const update = (key, nextValue) => onChange({ ...value, [key]: nextValue });
    return <section className="card">
        <h3>Ban emoji</h3>
        <div className="field switch"><label>Enabled</label><input type="checkbox" checked={Boolean(value.enabled)} onChange={event => update('enabled', event.target.checked)} /></div>
        <div className="field switch"><label>Log violations</label><input type="checkbox" checked={Boolean(value.log)} onChange={event => update('log', event.target.checked)} /></div>
        <div className="field"><label>Log channel</label><select value={value.log_channel || ''} onChange={event => update('log_channel', event.target.value)}>
            <option value="">Select a Discord channel</option>
            {options.channels.map(channel => <option key={channel}>{channel}</option>)}
        </select></div>
        <div className="field"><label>Banned emojis</label><div className="emoji-list">
            {(value.emojis || []).map((emoji, index) => <div className="emoji-row" key={`${emoji}-${index}`}><EmojiInput value={emoji} onChange={nextEmoji => update('emojis', value.emojis.map((item, itemIndex) => itemIndex === index ? nextEmoji : item))} /><button className="button danger" type="button" onClick={() => update('emojis', value.emojis.filter((_, itemIndex) => itemIndex !== index))}>Delete</button></div>)}
        </div></div>
        <button className="button ghost" type="button" onClick={() => update('emojis', [...(value.emojis || []), ''])}>Add emoji</button>
    </section>;
}
