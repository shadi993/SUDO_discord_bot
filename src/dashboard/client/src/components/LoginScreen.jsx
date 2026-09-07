import React from 'react';
import { Brand } from './Brand.jsx';

export function LoginScreen({ error }) {
    return (
        <div className="login-screen">
            <div className="login-frame">
                <div className="login-visual">
                    <img src="https://sudo.gay/assets/logo-C2IqITl_.png" alt="SUDO character illustration" />
                </div>
                <div className="login-panel">
                    <div className="login-card">
                        <Brand />
                        <p className="eyebrow">DISCORD BOT CONTROL ROOM</p>
                        <h1>Configure your server.</h1>
                        <p className="muted">Sign in with Discord. Only server administrators can open or save settings.</p>
                        <a className="button primary" href="/auth/login">Continue with Discord <span>↗</span></a>
                        {error && <p className="error">{error}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
