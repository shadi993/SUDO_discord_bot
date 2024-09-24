import * as dotenv from 'dotenv';  
import { InitConfig } from '../core/config.mjs';  
import { InitDatabase } from '../core/database.mjs';  
import { PostCountDboEntity } from '../core/database.mjs'; 
import { calculateXPForLevel } from '../modules/leveling.mjs';
import * as fs from 'fs';  

dotenv.config();  
InitConfig();  

(async () => {
    await InitDatabase();

    const userLevels = JSON.parse(fs.readFileSync('./userid_levels.json'));

    for (const [discord_id, level] of Object.entries(userLevels)) {
        const xp = calculateXPForLevel(level);  

        let user = await PostCountDboEntity.findOne({ where: { discord_id } });

        if (!user) {

            await PostCountDboEntity.create({ discord_id, xp });
        } else {
            user.xp = xp;
            await user.save();
        }
    }

    console.log('Import completed.');
})();