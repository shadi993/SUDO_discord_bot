import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';
import url from 'node:url';

const directory = path.dirname(url.fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, path.resolve(directory, '../..'), '');
    const dashboardUrl = env.DISCORD_DASHBOARD_URL || `http://127.0.0.1:${env.DISCORD_DASHBOARD_PORT || 3000}`;
    return {
        root: path.join(directory, 'client'),
        server: {
            proxy: {
                '/api': { target: dashboardUrl, changeOrigin: true },
                '/auth': { target: dashboardUrl, changeOrigin: true }
            }
        },
        build: {
            outDir: path.join(directory, 'dist'),
            emptyOutDir: true
        }
    };
});
