Set the following ENVs:

- `OPENAI_API_KEY`: Your Open AI Api key for the chat completions
- `DISCORD_TOKEN`: The Discord Bot Token
- `LANGUAGE_MODEL`: The language model to use for chat completions (gpt-3.5-turbo, text-davinci-003, whatever)
- `ERROR_RESPONSE`: What to say if the bot encounters a general error
- `SYSTEM_MESSAGE`: Initialize the bot with a System message ie. "You are the Master Chief from Halo. Stay in character"
- `MODERATION_VIOLATION_RESPONSE`: What to say if there's an Open AI flagged message from the responses. If you see this, the chat history will be reset

Note, for gpt-3.5-turbo the token limit is 4096, so the bot won't remember extremely long conversations. The oldest will be removed if the limit is reached.  Other models is even less

Your bot needs to have the "Message Content Intent" permission enabled

In your server, it needs to be given "bot", "Read Messages/View Channels", and "Send Messages" permissions

Or just use the [Docker](https://hub.docker.com/repository/docker/mobatome/discordai/general)
