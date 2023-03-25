import {
  type ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi
} from 'openai'

import { Client, Events, GatewayIntentBits } from 'discord.js'
import { encode } from 'gpt-3-encoder'
import { getEnv } from './env'
import { Messages } from './messages'
import { OpenAiHelper } from './OpenAiHelper'

const API_KEY = getEnv('API_KEY')
const DISCORD_TOKEN = getEnv('DISCORD_TOKEN')
const LANGUAGE_MODEL = getEnv('LANGUAGE_MODEL')
const ERROR_RESPONSE = getEnv('ERROR_RESPONSE')
const MODERATION_VIOLATION = getEnv('MODERATION_VIOLATION')
const SYSTEM_MESSAGE = getEnv('SYSTEM_MESSAGE')

const MAX_TOKENS_IN_MESSAGES = LANGUAGE_MODEL === 'gpt-3.5-turbo' ? 4096 : 2048

const openAiHelper = new OpenAiHelper(
  new OpenAIApi(
    new Configuration({
      apiKey: API_KEY
    })),
  LANGUAGE_MODEL)

const systemMessages: ChatCompletionRequestMessage[] = [{
  role: ChatCompletionRequestMessageRoleEnum.System,
  content: SYSTEM_MESSAGE
}]

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent]
})

client.once(Events.ClientReady, () => {
  console.log(
    `Ready!  Using model: ${LANGUAGE_MODEL} and system message ` +
    `${systemMessages.map((message) => message.content).join(', ')}`)
})

const messages = new Messages(systemMessages)

const countTokens = async (channelId: string): Promise<number> => {
  return encode(JSON.stringify((await messages.getMessages(channelId)))).length
}

client.on(Events.MessageCreate, async (message) => {
  if ((client.user?.id) == null || message.channelId == null) {
    return
  }

  // ignore our own messages
  if (message.author.id === client.user.id) {
    return
  }

  if ((await messages.getMessages(message.channelId)) == null) {
    console.log('Channel messages is null, ignoring message: ' +
      message.content)
    return
  }

  await messages.addMessage(message.channelId, {
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: message.content,
    name: message.author.username.replace(/\s/g, '').trim() // need to remove whitespace.. it breaks
  })

  // also ignore @everyone or role mentions
  if (message.mentions.everyone || message.mentions.roles.size > 0) {
    return
  }

  // also ignore all bots.. we don't want to get into a loop
  if (message.author.bot) {
    return
  }

  const existingMessages = await messages.getMessages(message.channelId)
  console.log('Existing messages: ' + existingMessages.length.toString())

  if (!message.mentions.has(client.user)) {
    console.log('Message does not mention bot, ignoring')
    return
  }

  // if we were mentioned, reply with the completion

  // set typing
  await message.channel.sendTyping()
  // continulously send typing while waiting for the completion
  const typingInterval = setInterval(() => {
    message.channel.sendTyping().then(() => {
      console.log('Sent typing...')
    }).catch(() => {
      console.error('Error sending typing')
    })
  }, 5000)

  try {
    console.log('Checking moderation...')

    const currentMessages = await messages.getMessages(message.channelId)

    console.log(currentMessages?.map((message) =>
      message.content) ?? [])

    // ensure the message is appropriate
    const inappropriate = await openAiHelper.areMessagesInappropriate(
      currentMessages.map((message) => message.content)
    )

    if (inappropriate) {
      console.log('Message flagged: ' + message.content)
      await messages.clearMessages(message.channelId)
      clearInterval(typingInterval)
      await message.reply(MODERATION_VIOLATION)
      return
    }

    console.log('Generating completion... messages in history')

    // if our messages are too long, remove oldest ones until we're
    // under the MAX_TOKENS_IN_MESSAGES
    // ignore System messages in this calculation
    let totalTokens = await countTokens(message.channelId)
    while (totalTokens > MAX_TOKENS_IN_MESSAGES) {
      console.log('Removing oldest message to make room for new message: ')
      await messages.removeOldestNonSystemMessage(message.channelId)
      totalTokens = await countTokens(message.channelId)
      console.log(`Total tokens: ${totalTokens}`)
    }

    console.log(`Generating completion using ${(await countTokens(message.channelId))
      .toString()} tokens`)

    const response = await openAiHelper.createChatCompletion(
      currentMessages ?? [],
      message.author.id
    )

    await messages.addMessage(message.channelId, {
      role: ChatCompletionRequestMessageRoleEnum.Assistant,
      content: response,
      // remove whitespace from username
      name: client.user.username.replace(/\s/g, '').trim()
    })

    console.log('Response: ' + response)
    // if the message is too long, split it up into max of 2000
    // characters per message
    // split up the messsage into each 2000 character chunks
    const chunks = response.match(/[\s\S]{1,2000}/g)
    for (const chunk of chunks ?? []) {
      await message.reply(chunk)
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
client.login(DISCORD_TOKEN).then(() => {
  console.log('Logged in!')
}).catch((e) => {
  console.error(e)
})
