import * as fs from 'node:fs';

export var Config;

export const InitConfig = () => {
    Config = JSON.parse(fs.readFileSync('roles.json'));

    if (!Config) {
        throw new Error('Config must be an object.');
    }
}
