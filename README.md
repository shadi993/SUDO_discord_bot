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
DISCORD_DASHBOARD_CLIENT_SECRET=CHANGE_ME
DISCORD_DASHBOARD_REDIRECT_URI=http://localhost:3000/auth/callback
DISCORD_DASHBOARD_PORT=3000
DATABASE_CONNECTION_STRING=sqlite:data/sudobotdb.sqlite
```

You must create an application on:

https://discord.com/developers/applications

This will give you the bot token. The client id is the app id of your application which can also be found there.

The guild id is the id of your server where you test the bot. You can enable developer mode in your discord and copy it. See here:

https://support.discord.com/hc/en-us/articles/206346498

You can then right-click your server in discord and click "Copy Server Id".

Now you must configure the database connection string in config.json. If you are developing locally, its easiest to just use an sqlite file.
Once you have done that you must create the database and tables:

```
npm run createdb
```

After that, you must register the chat commands at least once. If you add or change a command you must also run this first:

```
npm run deploycommands
```

## Developing and Running

### Debugging from Visual Studio Code

Click on the `Run and Debug` button on the left and then at the top make sure `Debug Discord Bot` is selected. You
can now click on the little play button to start debugging. You can set breakpoints and step through the program.
Clicking on the stop button at the top of the screen will close the program and stop debugging.

Typically, pressing F5 will also work.

You may need the appropriate Javascript and Node plugins to do this.

### From the command line

To start debugging/testing with the command line you can make the bot automatically reload itself when
you make changes to the code.

Type the following:

```
npm run dev
```

### Admin dashboard

The bot serves an administrator-only dashboard at `http://localhost:3000`.
General runtime settings are stored in `src/core/settings.config.js`
and are intentionally not dashboard feature configuration.
Add the matching `DISCORD_DASHBOARD_REDIRECT_URI` to the Discord developer
portal. Sign-in checks the user against `DISCORD_GUILD_ID` and only permits
server administrators or the server owner. The dashboard edits and saves the consolidated `config.json`; each module is
stored under its own named section (for example `"honeypot": {"enabled": true}`)
. The dashboard also provides
top-right import and export controls for the consolidated configuration.

`npm run dev` continues to run the bot and show its existing terminal logs.
The main config is updated immediately. Module enable switches are respected by
both event modules and their related commands.

The dashboard frontend is a modular React application under
`src/dashboard/client`. Run `npm run dashboard:build` to rebuild its Vite
bundle; `npm run dev` runs that build automatically before starting the bot.
Dashboard tabs and field controls are declarative in
`src/dashboard/client/src/layout.config.js`. Add a new top-level module section
to `config.json`, then register its label and field types there. Supported
controls include toggles, channel and role selectors, repeatable frames with
add/delete actions, and numeric fields. Repeatable frames can define nested
`fields`, so a module can describe complete panels and options without adding
dashboard component code. The existing roles panel demonstrates nested channel,
title, role option, description, role name, button emoji, button text,
requirements, and required-role controls.

## Submitting changes

Before submitting a Pull Request, please run the following command and fix all errors (if any):

```
npm run lint
```

## Configuration

The .env file is the configuration of secrets that should never be known publicly. However we also have a lot
of settings that can just be shared publicly. For this you can change the `config.json` file.

### Log Level

By default the log level is `debug`. This is fine for development use. You can change the log level in `config.json`

```
"log_level": "info"
```

## Database

You can configure the database connectionstring in `config.json` by changing the `connection_string` entry.
There are also other connection strings in there named _a _b etc. Those are just there to easily switch. They
are not used by the program.

You must configure a database string and then run:

```
npm run createdb
```

If you want to wipe your database and recreate the tables forcefully you can use:

```
npm run createdb -- --wipe
```

WARNING: This permanently wipes the data in your database. Use only during development.


If you were using probot level up system and you want to move the levels/rank to SUDO bot, use:

```
npm run scrape-levels
```

Make sure to add this to the .env:

```
DISCORD_SCRAPE_CHANNEL_ID=
```

Then run this to import all the ranks to SUDO bot's database:

```
npm run import-levels
```

In case you you were using an old ver of the SUDO bot that didn't has a points column, then run this command: 

```
npm run migratedb
```

Alternatively you can just run this on your bot's docker host:

```
echo 'alter table "DiscordUserXps" add column if not exists points bigint default 0;' | docker compose exec -T sudo-bot-db psql -U admin sudobotdb
```