# Discord AI Bot Repository

## Overview

This repository contains a Discord bot that leverages OpenAI's powerful language models to generate AI-driven responses to messages. By using the provided configuration options, you can easily set up a Discord bot to chat with users

## Features

- Utilizes OpenAI's API for natural language generation
- Customizable bot name and image
- Option to reply to all messages or just mentions
- Option to limit bot to specific channels
- Error handling and moderation violation responses
- Commands to set and re-set system messages on the fly

# Instructions

## Creating a Discord App and Bot

If you already have an App and Bot, grab its token and skip this section.

This guide will walk you through the process of creating a Discord App and adding a Bot to it.

### Step 1: Go to Discord Developer Portal

1. Visit the Discord Developer Portal at [https://discord.com/developers/applications](https://discord.com/developers/applications).
2. Log in with your Discord account if you haven't already.

### Step 2: Create a New Application

1. Click the `New Application` button at the top-right corner.
2. Enter a name for your application and click `Create`.

### Step 3: Set Up the Bot

1. In the Application Dashboard, click on the `Bot` tab in the left-hand menu.
2. Click on the `Add Bot` button, then click `Yes, do it!` to confirm.

### Step 4: Configure the Bot

1. Under the `Bot` tab, you can customize your bot by setting its username, profile picture, and description.
2. You can also set your bot's public visibility, which determines whether other users can see or add your bot.

### Step 5: Enable Message Content Intent

1. In the `Bot` section, scroll to `Privileged Gateway Intents`
2. Enable the `Message Content Intent` option.  This allows your bot to see message content.

### Step 6: Get the Bot Token

1. Go back to the `Bot` tab, and you'll find a `Token` section.
2. Click on `Copy` to copy the bot token to your clipboard. **Keep this token safe, as it allows access to your bot's account.** You'll need this token when setting up your bot in your code.

### Step 7: Add the Bot to a Server

1. Go back to the Application Dashboard and click on the `OAuth2` tab in the left-hand menu.
2. Select the `URL Generator`
2. In the `Scopes` section, check the box for `bot`.
3. In the `Bot Permissions` section, select the following permissions:
    * Read Messages/View Channels
    * Send Messages
4. Copy the Generated URL and paste it into your address bar
5. After authorizing the bot, you'll be redirected to a page where you can select the server you want to add the bot to.
6. Choose a server from the dropdown menu and click on the `Continue` button.
7. Review the permissions and click on the `Authorize` button.
8. Complete the CAPTCHA verification if prompted.

Your Discord Bot is now created and added to your server. You can use the bot token in your code to interact with the Discord API and build your custom bot functionality.

---

## Open AI Api Key

1. Get an OpenAI Api Key [Here](https://openai.com/product)
1. After setting up, your API keys can be found on [this page](https://platform.openai.com/account/api-keys)
1. Just click `+ Create new secret key` and copy the contents. Again, **Keep this token safe!**

> Note: as of this writing (March 26, 2023) the API usage pricing is pretty cheap.
> A "full" completion (4096 tokens for `gpt-3.5-turbo`) would cost about $0.008 USD (or 0.8 cents) per response.
> 
> So a conversation with 1000 responses would cost about USD $8.00. Other models have different pricing.
> 
> Review the [pricing page](https://openai.com/pricing) in case this changed
--- 

## Running the bot

Next we'll run the code so the bot does its thing

## Running the Bot with Docker (easiest)

The image is available on Docker Hub as [mobatome/discordai](https://hub.docker.com/r/mobatome/discordai).
Follow these step-by-step instructions. 

1. Make sure you have Docker installed on your system. [Docker Desktop](https://www.docker.com/products/docker-desktop/) here 
2. Pull the image from Docker Hub by running the following command:
```shell
docker pull mobatome/discordai
```
3. Run the Docker container with your environment variables defined directly in the `docker run` command:
```shell
docker run -d --name discord-ai-bot
-e OPENAI_API_KEY='your_openai_api_key'
-e DISCORD_TOKEN='your_discord_token'
mobatome/discordai
```

> Don't forget to set any optional envs you may want to set.

Thats it!

## Running with Docker and a `.env` file
This might be better if you plan on tweaking any of the environment variables regularly

1. Create a `.env` file with your environment variables:
```env
OPENAI_API_KEY=your_openai_api_key
DISCORD_TOKEN=your_discord_token

# the below are optional

# LANGUAGE_MODEL=gpt-3.5-turbo
# ERROR_RESPONSE=
# SYSTEM_MESSAGE=
# MODERATION_VIOLATION_RESPONSE=
# BOT_NAME=
# BOT_IMAGE_URL=
# ONLY_RESPOND_TO_MENTIONS=
# ONLY_RESPOND_IN_CHANNEL=
# IGNORE_BOTS=
# IGNORE_EVERYONE=
# DISCLAIMER=
# MAX_TOKENS_PER_MESSAGE=
```
4. Run the Docker container with your `.env` file:
```shell
docker run -d --name discord-ai-bot --env-file .env mobatome/discordai
```

---

### Running it raw
If you don't wanna use Docker, you can just run the code directly

1. Clone this repository
2. Navigate to the directory where you cloned the repository
2. Install the required dependencies with `yarn` or `npm install`
3. Create `.env` file with your environment variables:
```env
OPENAI_API_KEY=your_openai_api_key
DISCORD_TOKEN=your_discord_token

# the below are optional
# LANGUAGE_MODEL=gpt-3.5-turbo
# ERROR_RESPONSE=
# SYSTEM_MESSAGE=
# MODERATION_VIOLATION_RESPONSE=
# BOT_NAME=
# BOT_IMAGE_URL=
# ONLY_RESPOND_TO_MENTIONS=
# ONLY_RESPOND_IN_CHANNEL=
# IGNORE_BOTS=
# IGNORE_EVERYONE=
# DISCLAIMER=
# MAX_TOKENS_PER_MESSAGE=

```
4. Run the bot with `yarn start` or `npm start`

--- 
# Discord Bot Commands

This Discord bot has two primary commands. These commands are `/reset` and `/system`.

By default, the following roles will have permission to use these commands: `Administrator`, `ManageMessages`, `ManageChannels`, `ManagerGuild`, `ModerateMembers` but of course you can override these permissions in your server settings.

## /reset

The `/reset` command allows users to clear messages from the bot's memory based on the message type. Users can choose to reset ALL, user, system, or "bot" messages. A button will appear in the chat window that allows users to reset the messages. Use this if things are getting too wacky or you want to start over.  Note, if you set any `SYSTEM_MESSAGE` environment variables, it will be retained.  The command will only reset any messages that were set by the `/system` command.

## /system

The `/system` command will allow you to set the `system` message for the bot.  This can guide the bot to act a certain way.  For example:
- You only speak spanish
- You are a pirate
- You are a time traveller from the year 2552
- You are some character from a popular show or movie
- You only speak in pig latin
- You overuse emojis 😀
--- 

## Configuration

These are the list of environment variables you can set to configure the bot.

### Required

- `OPENAI_API_KEY`: Your API key for OpenAI, used to authenticate with the OpenAI API. [More info](https://openai.com/blog/openai-api)
- `DISCORD_TOKEN`: Your Discord Bot token, required for the bot to work with Discord

### Optional
- `SYSTEM_MESSAGE`: The initial prompt to use with the bot, sent as a "system" message. Example: `You are the Master Chief from Halo. Stay in character as much as possible` You can also set or clear system messages with the `/system` and `/reset` command (see above)
- `ERROR_RESPONSE`: The message the bot will send when there's an error in processing the user's input. These appear when there's some sort of error. See the logs for information. Default: `Sorry, there was an error. Please try again later.`
- `MODERATION_VIOLATION_RESPONSE`: The message the bot will send when a user's input violates OpenAI's moderation policy. It should probably also mention that the chat history will stop being processed before this point.  Default: `Some content in this chat's history was detected violating Open AI's usage policies. Chat history has been cleared from future responses.`
- `LANGUAGE_MODEL`: The OpenAI language model you wish to use.  Defaults to `gpt-3.5-turbo`.
- `BOT_NAME`: A custom name for your bot. You can also set this in the [Discord Developer Portal](https://discord.com/developers/applications)
- `BOT_IMAGE_URL`: A URL for a custom image to represent your bot. Also can be set in the [Discord Developer Portal](https://discord.com/developers/applications)
- `ONLY_RESPOND_TO_MENTIONS`: Set this to `false` if you want the bot to respond to every message in a channel (default: `true`).  This can become expensive/chaotic so be careful. This will also behave differently depending if bot was mentioned.  If the bot is mentioned, it will "reply", but if this config is set to `false` and it sees a message, it will just send a message to the channel normally.  If it sees a message that has mentions and the bot is not mentioned, it will not respond.
- `ONLY_RESPOND_IN_CHANNEL`: A comma-separated list of channel IDs if you want the bot to work only in specific channels. By default, it will operate in all channels it has access to.  To find a channel ID, enable "developer mode" in Discord and right click a text channel.
- `IGNORE_BOTS`: Set this to `false` if you want the bot to respond to other bots (default: `true`) (This can become expensive/chaotic so be careful)
- `IGNORE_EVERYONE`: Set this to `false` if you want the bot to respond to messages that mention `@everyone` or `@here` (default: `true`)
- `DISCLAIMER`: This message will be sent immediatly before the first chat response is sent. [OpenAI Policy](https://openai.com/policies/usage-policies) requires chatbots to disclose that users are interacting with an AI system.  Read the [OpenAI Policy](https://openai.com/policies/usage-policies) for more information on how to comply with their policies.
- `MAX_TOKENS_PER_MESSAGE`: Set a limit for the number of tokens used per chat completion. If you set this number too small the bot won't "remember" many past messages, but if you set it too high, your bill will be higher.  By default it's the max of the model. [See here for more info](https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them)

## Memory and Token Limit

The OpenAI language models, such as `gpt-3.5-turbo`, have a token limit that affects the amount of text they can process in a single API call. The token limit for `gpt-3.5-turbo` is 4096 tokens. Each token can represent a single character or a few characters, such as a word or a punctuation mark.

Due to this token limit, the bot will only remember the most recent messages up to the model's token limit. If the conversation history exceeds this limit, the bot may not be able to remember or respond to older messages appropriately. Keep in mind that very long conversations might also result in incomplete or truncated responses from the bot.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Contributions

Contributions are welcome! Feel free to submit issues or pull requests to improve the Discord AI Bot.
