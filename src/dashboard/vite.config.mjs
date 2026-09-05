import { defineConfig } from 'vite';
import path from 'node:path';
import url from 'node:url';

const directory = path.dirname(url.fileURLToPath(import.meta.url));

export default defineConfig({
    root: path.join(directory, 'client'),
    build: {
        outDir: path.join(directory, 'dist'),
        emptyOutDir: true
    }
});
