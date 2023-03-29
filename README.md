# Discord AI Bot Repository

## Overview

This repository contains a Discord bot that leverages OpenAI's powerful language models to generate AI-driven responses to messages. By using the provided configuration options, you can easily set up a Discord bot to chat with users

## Features

- Utilizes OpenAI's API for natural language generation
- Option to reply to all messages or just mentions
- Commands to set and re-set system messages on the fly to guide the bot to act a certain way

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
```
4. Run the bot with `yarn start` or `npm start`

--- 
# Discord Bot Commands

Below is a list of the available bot commands with their respective descriptions:

### `/reset`

**Description:** Reset the chat for this channel.

**Options:**

- `reset_type` (required): What to reset.
  - `All - Clear ALL messages (User, System, and Bot)`
  - `User - Clear only User messages`
  - `Bot - Clear only Bot messages`
  - `System - Clear only System messages`

### `/config`

**Description:** Configure the chat for this channel.

**Options:**

- `only_mentions` (required): Only respond to mentions (default: true).
- `ignore_bots` (required): Ignore messages from bots (default: true).
- `ignore_everyone_mentions` (required): Ignore @everyone and @here (default: true).
- `language_model` (required): Which language model to use (default: GPT-3.5 Turbo).
  - `GPT-3.5 Turbo`
  - `GPT-4`

*Note: The `/config` command is only available for users with Administrator or Manage Guild permissions.*

### `/tokens`

**Description:** Check how many tokens are available.

*Note: The `/tokens` command is only available for users with Administrator or Manage Guild permissions.*

### `/system`

**Description:** Add a system message to this channel. `system` messages can guide the bot to act a certain way.  For example:
- You only speak spanish
- You are a pirate
- You are a time traveller from the year 2552
- You are some character from a popular show or movie
- You only speak in pig latin
- You overuse emojis 😀

**Subcommands:**

- `add`: Add a system message. Example:
  - `message` (required): The message to add.
- `list`: List all system messages.

*Note: The `/system` command is only available for users with Administrator or Manage Guild permissions.*

--- 

## Configuration

These are the list of environment variables you can set to configure the bot.

### Required

- `OPENAI_API_KEY`: Your API key for OpenAI, used to authenticate with the OpenAI API. [More info](https://openai.com/blog/openai-api)
- `DISCORD_TOKEN`: Your Discord Bot token, required for the bot to work with Discord

## Memory and Token Limit

The OpenAI language models, such as `gpt-3.5-turbo`, have a token limit that affects the amount of text they can process in a single API call. The token limit for `gpt-3.5-turbo` is 4096 tokens. Each token can represent a single character or a few characters, such as a word or a punctuation mark.

`gpt-4` has a larger limit of 8192 tokens.

Due to this token limit, the bot will only remember the most recent messages up to the model's token limit. If the conversation history exceeds this limit, the bot may not be able to remember or respond to older messages appropriately. Keep in mind that very long conversations might also result in incomplete or truncated responses from the bot.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Contributions

Contributions are welcome! Feel free to submit issues or pull requests to improve the Discord AI Bot.
