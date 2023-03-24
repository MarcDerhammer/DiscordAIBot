import {
  type ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi
} from 'openai'

import { Client, Events, GatewayIntentBits } from 'discord.js'

import { encode } from 'gpt-3-encoder'

import dotenv from 'dotenv'
dotenv.config()

const API_KEY = process.env.OPENAI_API_KEY
const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const LANGUAGE_MODEL = process.env.LANGUAGE_MODEL
const SYSTEM_MESSAGE = process.env.SYSTEM_MESSAGE
const ERROR_RESPONSE = process.env.ERROR_RESPONSE
const MODERATION_VIOLATION = process.env.MODERATION_VIOLATION_RESPONSE

const MAX_TOKENS_IN_MESSAGES = 2000 // todo: improve this...

if (API_KEY === undefined) {
  console.error('Please set the OPENAI_API_KEY environment variable.')
  process.exit(1)
}

if (DISCORD_TOKEN === undefined) {
  console.error('Please set the DISCORD_TOKEN environment variable.')
  process.exit(1)
}

if (LANGUAGE_MODEL === undefined) {
  console.error('Please set the LANGUAGE_MODEL environment variable.')
  process.exit(1)
}

if (ERROR_RESPONSE === undefined) {
  console.error('Please set the ERROR_RESPONSE environment variable.')
  process.exit(1)
}

if (MODERATION_VIOLATION === undefined) {
  console.error('Please set the MODERATION_VIOLATION environment variable.')
  process.exit(1)
}

const openai = new OpenAIApi(new Configuration({
  apiKey: API_KEY
}))

const systemMessages = [
  {
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: 'You are chatting within a Discord channel'
  }
]

if (SYSTEM_MESSAGE !== undefined) {
  systemMessages.push({
    role: ChatCompletionRequestMessageRoleEnum.System,
    content: SYSTEM_MESSAGE
  })
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent]
})

client.once(Events.ClientReady, () => {
  console.log(`Ready!  Using model: ${LANGUAGE_MODEL} and system message 
       ${systemMessages.map((message) => message.content).join(', ')}`)
})

// create a hashmap of messages to represent the conversation ongoings for
// each channel. the key will be the channel id
const messages = new Map<string, ChatCompletionRequestMessage[]>()

client.on(Events.MessageCreate, async (message) => {
  if ((client.user?.id) == null || message.channelId == null) {
    return
  }

  // ignore our own messages
  if (message.author.id === client.user.id) {
    return
  }
  // add the message to the conversation
  if (!messages.has(message.channelId)) {
    messages.set(message.channelId, systemMessages)
  }

  // if our messages are too long, remove oldest ones until we're
  // under the MAX_TOKENS_IN_MESSAGES
  // ignore System messages in this calculation
  let totalTokens = messages.get(message.channelId)?.filter(
    (message) => message.role !== ChatCompletionRequestMessageRoleEnum.System)
    .map((message) => encode(message.content).length)
    .reduce((a, b) => a + b, 0) ?? 0
  while (totalTokens > MAX_TOKENS_IN_MESSAGES) {
    messages.get(message.channelId)?.shift()
    totalTokens = messages.get(message.channelId)?.filter(
      (message) => message.role !== ChatCompletionRequestMessageRoleEnum.System)
      .map((message) =>
        encode(message.content).length).reduce((a, b) => a + b, 0) ?? 0
  }

  if (messages.get(message.channelId) == null) {
    console.log('Channel messages is null, ignoring message: ' +
            message.content)
    return
  }

  // get username with all whitespace removed
  const name = message.author.username.replace(/\s/g, '').trim()

  messages.get(message.channelId)?.push({
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: message.content,
    name
  })

  // if we were mentioned, reply with the completion
  if (message.mentions.has(client.user)) {
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

      if (messages.get(message.channelId) == null) {
        console.log('Channel messages is null, ignoring message: ' +
                message.content)
        return
      }

      // ensure the message is appropriate
      const moderation = await openai.createModeration({
        input: messages.get(message.channelId)?.map((message) =>
          message.content) ?? []
      })

      console.log(moderation.data.results)

      if (moderation.data.results.find(result => result.flagged) != null) {
        console.log('Message flagged: ' + message.content +
                    ' Resetting everything...')
        await message.reply(MODERATION_VIOLATION)
        console.log(JSON.stringify(messages.get(message.channelId)))
        console.log(messages.delete(message.channelId))
        console.log(JSON.stringify(messages.get(message.channelId)))
        clearInterval(typingInterval)
        return
      }

      console.log('Generating completion... messages in history')

      const response = await openai.createChatCompletion({
        model: LANGUAGE_MODEL,
        messages: messages.get(message.channelId) ?? [],
        user: message.author.id
      })

      // print usage information
      console.log('Usage: ' + JSON.stringify(response.data.usage))

      console.log('Replying with completion...')

      if (response.data.choices.length === 0) {
        console.log('No choices returned!')
        await message.reply(ERROR_RESPONSE)
        clearInterval(typingInterval)
        return
      }

      const firstResponse = response.data.choices[0]

      if (firstResponse.message == null ||
                firstResponse.message.content === '') {
        console.log('No message returned!')
        await message.reply(ERROR_RESPONSE)
        clearInterval(typingInterval)
        return
      }

      if (firstResponse.finish_reason === 'content_filter') {
        console.log(`Content filter triggered: 
          ${firstResponse.message.content}`)
        await message.reply(ERROR_RESPONSE)
        clearInterval(typingInterval)
        return
      }

      const reply = firstResponse.message.content

      // // let's make sure our own response isn't flagged
      // const moderation2 = await openai.createModeration({
      //   input: [reply]
      // })

      // if (moderation2.data.results.find(result => result.flagged) != null) {
      //   console.log('Reply flagged: ' + reply + ' Resetting everything...')
      //   await message.reply(MODERATION_VIOLATION)
      //   // messages.set(message.channel.id, systemMessages)
      //   messages.delete(message.channelId)
      //   console.log(JSON.stringify(messages.get(message.channelId)))
      //   clearInterval(typingInterval)
      //   return
      // }

      messages.get(message.channelId)?.push({
        role: ChatCompletionRequestMessageRoleEnum.Assistant,
        content: reply
      })
      clearInterval(typingInterval)
      await message.reply(reply)
    } catch (e) {
      console.log(e)
      await message.reply(ERROR_RESPONSE)
    } finally {
      clearInterval(typingInterval)
    }
  }
})

// let's begin!
client.login(DISCORD_TOKEN).then(() => {
  console.log('Logged in!')
}).catch((e) => {
  console.error(e)
})
