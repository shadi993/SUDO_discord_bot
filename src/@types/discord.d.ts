import { Client, Collection } from "discord.js";

/**
 * We recommend attaching a .commands property to your client instance so that you can access your commands in other files. The rest of the examples in this guide will follow this convention. For TypeScript users, we recommend extending the base Client class to add this property, casting, or augmenting the module type.
 * Quote on discordjs.guide https://discordjs.guide/creating-your-bot/command-handling.html#loading-command-files
 */

declare module "discord.js" {
    export interface Client {
        commands: Collection<any, any>;
    }
}