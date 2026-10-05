import React, { useEffect, useState } from 'react';

const maxImageBytes = 8 * 1024 * 1024;

function readImage(file) {
    if (!file) return Promise.resolve(null);
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
        return Promise.reject(new Error('Image must be PNG, JPEG, GIF, or WebP.'));
    }
    if (file.size > maxImageBytes) return Promise.reject(new Error('Image must be smaller than 8 MB.'));
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected image.'));
        reader.readAsDataURL(file);
    });
}

export function BotProfileEditor({ api }) {
    const [profile, setProfile] = useState(null);
    const [avatarUpload, setAvatarUpload] = useState(null);
    const [bannerUpload, setBannerUpload] = useState(null);
    const [status, setStatus] = useState('online');
    const [statusText, setStatusText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        api('/api/bot-profile')
            .then(nextProfile => {
                setProfile(nextProfile);
                setStatus(nextProfile.status);
                setStatusText(nextProfile.statusText);
            })
            .catch(nextError => setError(nextError.message));
    }, [api]);

    const chooseImage = async (event, setter) => {
        setError('');
        try {
            setter(await readImage(event.target.files?.[0]));
        } catch (imageError) {
            setError(imageError.message);
        }
        event.target.value = '';
    };

    const save = async event => {
        event.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const updates = { status, statusText };
            if (avatarUpload) updates.avatar = avatarUpload;
            if (bannerUpload) updates.banner = bannerUpload;
            const nextProfile = await api('/api/bot-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            setProfile(nextProfile);
            setAvatarUpload(null);
            setBannerUpload(null);
            setNotice('Bot profile updated.');
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setBusy(false);
        }
    };

    const resetImage = async image => {
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const nextProfile = await api('/api/bot-profile/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image })
            });
            setProfile(nextProfile);
            if (image === 'avatar') setAvatarUpload(null);
            if (image === 'banner') setBannerUpload(null);
            setNotice(`${image === 'avatar' ? 'Profile picture' : 'Banner'} reset to default.`);
        } catch (resetError) {
            setError(resetError.message);
        } finally {
            setBusy(false);
        }
    };

    if (!profile) return <section className="card"><p>{error || 'Loading bot profile…'}</p></section>;
    return <form className="bot-profile" onSubmit={save}>
        <section className="card">
            <h3>Bot images</h3>
            <div className="profile-banner">
                {bannerUpload || profile.banner
                    ? <img src={bannerUpload || profile.banner} alt="Bot banner preview" />
                    : <span>No banner set</span>}
            </div>
            <div className="profile-avatar">
                {avatarUpload || profile.avatar
                    ? <img src={avatarUpload || profile.avatar} alt="Bot profile picture preview" />
                    : <span>No profile picture</span>}
            </div>
            <div className="profile-image-controls">
                <div className="field">
                    <label htmlFor="bot-avatar">Profile picture</label>
                    <input id="bot-avatar" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={event => chooseImage(event, setAvatarUpload)} />
                    <button className="button ghost" type="button" disabled={busy} onClick={() => resetImage('avatar')}>Reset to default</button>
                </div>
                <div className="field">
                    <label htmlFor="bot-banner">Banner</label>
                    <input id="bot-banner" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={event => chooseImage(event, setBannerUpload)} />
                    <button className="button ghost" type="button" disabled={busy} onClick={() => resetImage('banner')}>Reset to default</button>
                </div>
            </div>
        </section>
        <section className="card">
            <h3>Bot presence</h3>
            <div className="field">
                <label htmlFor="bot-status-text">Status text</label>
                <input id="bot-status-text" maxLength={128} value={statusText} onChange={event => setStatusText(event.target.value)} placeholder="What is the bot doing?" />
            </div>
            <div className="field">
                <label htmlFor="bot-visibility">Visibility</label>
                <select id="bot-visibility" value={status} onChange={event => setStatus(event.target.value)}>
                    <option value="online">Online</option>
                    <option value="idle">Idle</option>
                    <option value="dnd">Do not disturb</option>
                    <option value="invisible">Invisible</option>
                </select>
            </div>
            <div className="save-row">
                <button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
            </div>
        </section>
        {error && <p className="error" role="alert">{error}</p>}
        {notice && <p className="profile-notice" role="status">{notice}</p>}
    </form>;
}
