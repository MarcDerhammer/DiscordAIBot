# Discord AI Bot Repository

## Overview

This repository contains a Discord bot that leverages OpenAI's powerful language models to generate AI-driven responses to messages. By using the provided configuration options, you can easily set up the bot to work in specific channels, respond only to mentions, and even customize its appearance.

## Features

- Utilizes OpenAI's API for natural language generation
- Customizable bot name and image
- Option to respond only to mentions
- Option to limit bot to specific channels
- Error handling and moderation violation responses

## Configuration

To get started with the Discord AI Bot, you need to set up a few environment variables. These variables help you customize the bot's behavior, appearance, and access to OpenAI's API.

### Required

- `OPENAI_API_KEY`: Your API key for OpenAI, used to authenticate with the OpenAI API.
- `DISCORD_TOKEN`: Your Discord Bot token, required for the bot to function within your server.
- `LANGUAGE_MODEL`: The OpenAI language model you wish to use, such as `gpt-3.5-turbo`.
- `ERROR_RESPONSE`: The message the bot will send when there's an error in processing the user's input.
- `SYSTEM_MESSAGE`: The initial prompt to use with the bot, sent as a "system" message.
- `MODERATION_VIOLATION_RESPONSE`: The message the bot will send when a user's input violates OpenAI's moderation policy.

### Optional

- `BOT_NAME`: A custom name for your bot (default: AI Bot).
- `BOT_IMAGE_URL`: A URL for a custom image to represent your bot (default: none).
- `ONLY_RESPOND_TO_MENTIONS`: Set this to "false" if you want the bot to respond to every message in a channel (default: "true").
- `ONLY_RESPOND_IN_CHANNEL`: A comma-separated list of channel IDs if you want the bot to work only in specific channels (default: none).

## Discord Permissions

To ensure the bot functions correctly, you need to set specific permissions for it in the Discord Developer Portal:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and select your Application.
2. In the left sidebar, click on "Bot" to access the Bot section.
3. Enable the "Message Content Intent" permission. This allows the bot to read and understand messages in the chat.
4. In the left sidebar, click on "OAuth2" to access the URL Generator.
5. Under "Scopes," select the "bot" scope.
6. Under "Bot Permissions," check "Read Message History" and "Send Messages" permissions.
7. Copy the generated URL and use it to invite the bot to your server.

## Running the Bot with Docker

Alternatively, you can run the Discord AI Bot using Docker. The Docker image is available on Docker Hub as [mobatome/discordai](https://hub.docker.com/r/mobatome/discordai).

1. Make sure you have Docker installed on your system.
2. Pull the image from Docker Hub by running the following command:
```shell
docker pull mobatome/discordai
```
3. Create a `.env` file with your environment variables:
```env
OPENAI_API_KEY=your_openai_api_key
DISCORD_TOKEN=your_discord_token
LANGUAGE_MODEL=gpt-3.5-turbo
ERROR_RESPONSE=error_response_text
SYSTEM_MESSAGE=system_message_text
MODERATION_VIOLATION_RESPONSE=moderation_violation_response_text
# the below are optional
# BOT_NAME=
# BOT_IMAGE_URL=
# ONLY_RESPOND_TO_MENTIONS=
# ONLY_RESPOND_IN_CHANNEL=
```
4. Run the Docker container with your `.env` file:
```shell
docker run -d --name discord-ai-bot --env-file .env mobatome/discordai
```

### Option 2: Defining environment variables in the docker run command

If you'd rather not use a .env file, run the Docker container with your environment variables defined directly in the `docker run` command:
```shell
docker run -d --name discord-ai-bot
-e OPENAI_API_KEY='your_openai_api_key'
-e DISCORD_TOKEN='your_discord_token'
-e LANGUAGE_MODEL='gpt-3.5-turbo'
-e ERROR_RESPONSE='error_response_text'
-e SYSTEM_MESSAGE='system_message_text'
-e MODERATION_VIOLATION_RESPONSE='moderation_violation_response_text'
-e BOT_NAME='custom_bot_name'
-e BOT_IMAGE_URL='custom_bot_image_url'
-e ONLY_RESPOND_TO_MENTIONS='true'
-e ONLY_RESPOND_IN_CHANNEL=
mobatome/discordai
```

## Getting Started

1. Clone this repository.
2. Install the required dependencies.
3. Set up your environment variables based on the configuration options mentioned above.
4. Run the bot.
5. Invite the bot to your Discord server using the URL generated in the Discord Developer Portal and enjoy the AI-driven responses!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Contributions

Contributions are welcome! Feel free to submit issues or pull requests to improve the Discord AI Bot.
