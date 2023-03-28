import {
  type ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi
} from 'openai'

import { Client, Events, GatewayIntentBits } from 'discord.js'
import { getEnv } from './env'
import { Messages } from './Messages'
import { countTokens, getMaxTokens, type Model, OpenAiHelper } from './OpenAiHelper'

const API_KEY = getEnv('API_KEY')
const DISCORD_TOKEN = getEnv('DISCORD_TOKEN')
const LANGUAGE_MODEL = getEnv('LANGUAGE_MODEL')
const ERROR_RESPONSE = getEnv('ERROR_RESPONSE')
const MODERATION_VIOLATION = getEnv('MODERATION_VIOLATION')
const SYSTEM_MESSAGE = getEnv('SYSTEM_MESSAGE')
const BOT_NAME = getEnv('BOT_NAME')
const BOT_IMAGE_URL = getEnv('BOT_IMAGE_URL')
const CHANNEL_IDS = getEnv('ONLY_RESPOND_IN_CHANNEL') === ''
  ? []
  : getEnv('ONLY_RESPOND_IN_CHANNEL').split(',')

const ONLY_RESPOND_TO_MENTIONS = getEnv('ONLY_RESPOND_TO_MENTIONS').toLowerCase() === 'true' ||
  getEnv('ONLY_RESPOND_TO_MENTIONS') === ''
const IGNORE_BOTS = getEnv('IGNORE_BOTS').toLowerCase() === 'true'
const IGNORE_EVERYONE = getEnv('IGNORE_EVERYONE').toLowerCase() === 'true'
const DISCLAIMER = getEnv('DISCLAIMER')

const openAiHelper = new OpenAiHelper(
  new OpenAIApi(
    new Configuration({
      apiKey: API_KEY
    })
  ),
  LANGUAGE_MODEL
)

const systemMessages: ChatCompletionRequestMessage[] = [
  {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: SYSTEM_MESSAGE
  }
]

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

client.once(Events.ClientReady, () => {
  console.log(
    `Ready!  Using model: ${LANGUAGE_MODEL} and system message ` +
      `${systemMessages.map((message) => message.content).join(', ')}`
  )
})

const messages = new Messages(systemMessages)

const removeNonAlphanumeric = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9]/g, '').trim()
}

client.on(Events.MessageCreate, async (message) => {
  if (client.user?.id == null || message.channelId == null) {
    console.log('Client user or channel id is null, ignoring message')
    return
  }

  if (
    CHANNEL_IDS.length > 0 &&
    !CHANNEL_IDS.includes(message.channelId.toString())
  ) {
    console.log('Channel not in list, ignoring')
    return
  }

  // ignore our own messages
  if (message.author.id === client.user.id) {
    console.log('Ignoring our own message')
    return
  }

  if ((messages.getMessages(message.channelId)) == null) {
    console.log(
      'Channel messages is null, ignoring message: ' + message.content
    )
    return
  }

  messages.addMessage(message.channelId, {
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: message.content,
    name: removeNonAlphanumeric(message.author.username)
  })

  // also ignore @everyone or role mentions
  if ((message.mentions.everyone || message.mentions.roles.size > 0) && IGNORE_EVERYONE) {
    console.log('Ignoring @everyone or role mention')
    return
  }

  // also ignore all bots.. we don't want to get into a loop
  if (message.author.bot && IGNORE_BOTS) {
    console.log('Ignoring bot message')
    return
  }

  const existingMessages = messages.getMessages(message.channelId)
  console.log('Existing messages: ' + existingMessages.length.toString())

  if (!message.mentions.has(client.user) && ONLY_RESPOND_TO_MENTIONS) {
    console.log('Message does not mention bot, ignoring')
    return
  }

  // if there were mentions that don't include us, ignore
  if (message.mentions.users.size > 0 && !message.mentions.has(client.user)) {
    console.log('Message mentions other users, ignoring')
    return
  }

  // set typing
  await message.channel.sendTyping()
  // continulously send typing while waiting for the completion
  const typingInterval = setInterval(() => {
    message.channel
      .sendTyping()
      .then(() => {
        console.log('Sent typing...')
      })
      .catch(() => {
        console.error('Error sending typing')
      })
  }, 5000)

  try {
    console.log('Checking moderation...')

    const currentMessages = messages.getMessages(message.channelId)

    console.log(currentMessages?.map((message) => message.content) ?? [])

    // ensure the message is appropriate
    const inappropriate = await openAiHelper.areMessagesInappropriate(
      currentMessages.map((message) => message.content)
    )

    if (inappropriate) {
      console.log('Message flagged: ' + message.content)
      messages.clearMessages(message.channelId)
      clearInterval(typingInterval)
      await message.reply(MODERATION_VIOLATION)
      return
    }

    console.log('Generating completion... messages in history')

    // if our messages are too long, remove oldest ones until we're
    // under the MAX_TOKENS_IN_MESSAGES
    // ignore System messages in this calculation
    let totalTokens = countTokens(messages.getMessages(message.channelId))
    while (totalTokens > getMaxTokens(LANGUAGE_MODEL as Model)) {
      console.log('Removing oldest message to make room for new message: ')
      messages.removeOldestNonSystemMessage(message.channelId)
      totalTokens = countTokens(messages.getMessages(message.channelId))
      console.log(`Total tokens: ${totalTokens}`)
    }

    console.log(
      `Generating completion using ${totalTokens} tokens from history`
    )

    let response = await openAiHelper.createChatCompletion(
      currentMessages ?? [],
      message.author.id
    )

    // let's ensure our own response doesn't violate any moderation
    // rules
    if (await openAiHelper.areMessagesInappropriate([response])) {
      console.log('Response flagged: ' + response)
      messages.clearMessages(message.channelId)
      clearInterval(typingInterval)
      await message.reply(MODERATION_VIOLATION)
      return
    }

    messages.addMessage(message.channelId, {
      role: ChatCompletionRequestMessageRoleEnum.Assistant,
      content: response,
      name: removeNonAlphanumeric(client.user.username)
    })

    // if this is the first assistant message, send the disclaimer first
    if (currentMessages.filter(
      x => x.role === ChatCompletionRequestMessageRoleEnum.Assistant).length === 0 &&
    DISCLAIMER.length > 0) {
      response = DISCLAIMER + '\n\n' + response
    }

    console.log('Response: ' + response)
    // if the message is too long, split it up into max of 2000
    // characters per message
    // split up the messsage into each 2000 character chunks
    const chunks = response.match(/[\s\S]{1,2000}/g)
    for (const chunk of chunks ?? []) {
      // if it was a mention, reply to the message
      if (message.mentions.has(client.user)) {
        await message.reply(chunk)
      } else {
        // otherwise, send message to channel
        // (should only happen if ONLY_RESPOND_TO_MENTIONS = FALSE)
        await message.channel.send(chunk)
      }
    }
  } catch (e) {
    console.log(e)
    await message.reply(ERROR_RESPONSE)
  } finally {
    clearInterval(typingInterval)
  }
})

// every 10 minutes, set our status to online
setInterval(() => {
  client.user?.setStatus('online')
}, 10 * 60 * 1000)

// let's begin!
client
  .login(DISCORD_TOKEN)
  .then(async () => {
    console.log('Logged in!')
    // set the name and image (if defined)
    // and if the name is not the same as the current name, change it
    if (BOT_NAME.length > 0 && BOT_NAME !== client.user?.username) {
      console.log('Setting bot name to: ' + BOT_NAME)
      await client.user?.edit({ username: BOT_NAME })
    }

    // do the same for the bot image
    if (BOT_IMAGE_URL.length > 0 && BOT_IMAGE_URL !== client.user?.avatar) {
      console.log('Setting bot image to: ' + BOT_IMAGE_URL)
      await client.user?.setAvatar(BOT_IMAGE_URL)
    }
  })
  .catch((e) => {
    console.error(e)
  })
