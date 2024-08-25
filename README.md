# SUDO_discord_bot
Make sure to Create a .env file in the folder, and paste in the following:
```
DISCORD_CLIENT_ID=CHANGE_ME
DISCORD_GUILD_ID=CHANGE_ME
DISCORD_BOT_TOKEN=CHANGE_ME
```

The client id is the app id of your Application. You can find this here:

https://discord.com/developers/applications

The guild id is the id of your server where you test the bot. You can enable developer mode in your discord and copy it. See here:

https://support.discord.com/hc/en-us/articles/206346498

You can then rightclick your server and click "copy id".

Once you have done all this, you must register the chat commands at least once. If you add or change a command you must also run this first:

```
npm run deploycommands
```
