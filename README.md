# SUDO_discord_bot

## Getting started

You will need node.js and npm.

First you must install all dependencies.

```
npm install
```

After that create a .env file in the root directory, and paste in the following:
```
DISCORD_CLIENT_ID=CHANGE_ME
DISCORD_GUILD_ID=CHANGE_ME
DISCORD_BOT_TOKEN=CHANGE_ME
```

You must create an application on:

https://discord.com/developers/applications

This will give you the bot token. The client id is the app id of your application which can also be found there.

The guild id is the id of your server where you test the bot. You can enable developer mode in your discord and copy it. See here:

https://support.discord.com/hc/en-us/articles/206346498

You can then right-click your server in discord and click "Copy Server Id".

Once you have done all this, you must register the chat commands at least once. If you add or change a command you must also run this first:

```
npm run deploycommands
```

## Developing and Running

To start developing you can make the bot automatically reload itself when you make changes to the code.
Type the following:

```
npm run dev
```

## Submitting changes

Before submitting a Pull Request, please run the following command and fix all errors (if any):

```
npm run lint
```

## Logging

By default the log level is `info`. This is fine for normal use. During debugging you may want to use `debug` as a log level. You can add the following to your .env file for this:

```
LOG_LEVEL=debug
```
