import {
  ChatCompletionRequestMessageRoleEnum,
  ChatCompletionResponseMessageRoleEnum,
  Configuration,
  OpenAIApi
} from 'openai'

import {
  Client, type CommandInteraction,
  Events, GatewayIntentBits, TextChannel
} from 'discord.js'
import { getEnv } from './env'

import { OpenAiHelper } from './OpenAiHelper'
import { DEFAULT_GUILD_CONFIG, Guild } from './messages/Guild'
import { type ChannelConfig } from './messages/ChannelConfig'
import { Channel } from './messages/Channel'
import RegisterCommands from './commands/RegisterCommands'
import generateCheckout, { handleWebHook } from './stripe/Checkout'
import express from 'express'
import bodyParser from 'body-parser'
import { Message } from './messages/Message'
import { mongoClient } from './mongo/MongoClient'

const API_KEY = getEnv('API_KEY')
const DISCORD_TOKEN = getEnv('DISCORD_TOKEN')

const openAiHelper = new OpenAiHelper(
  new OpenAIApi(
    new Configuration({
      apiKey: API_KEY
    })
  )
)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

// const channels = new Map<string, Channel>()
const guilds = new Map<string, Guild>();

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  // load up all the guilds and messages
  const guildsCollection = mongoClient.db('discord').collection('guilds')
  const guildsCursor = await guildsCollection.find()
  const guildsDocs = await guildsCursor.toArray()
  for (const guildDoc of guildsDocs) {
    const guild = new Guild(guildDoc.id, guildDoc.config)
    guilds.set(guild.id, guild)
    // now look up all the channels for this guild
    const channelsCollection = mongoClient.db('discord').collection('channels')

    // query where guildId = guild.id
    const channelsCursor = await channelsCollection.find({ guildId: guild.id })
    const channelsDocs = await channelsCursor.toArray()

    // Process the channels as needed
    for (const channelDoc of channelsDocs) {
      console.log('Channel:', channelDoc)
      // Perform operations with the channelDoc
      const channel = new Channel(
        channelDoc.id,
        guild.id,
        channelDoc.config,
        channelDoc.disclaimerSent
      )
      guild.channels.set(channelDoc.id, channel)

      // Get all messages for the current channel
      const messagesCollection = mongoClient.db('discord').collection('messages')

      // query where channelId = channelDoc.id
      const messagesCursor = await messagesCollection.find({ channelId: channelDoc.id })
      const messagesDocs = await messagesCursor.toArray()

      // Process the messages as needed
      for (const messageDoc of messagesDocs) {
        console.log('Message:', messageDoc)
        const message = new Message({
          id: messageDoc.id,
          guildId: messageDoc.guildId,
          channelId: messageDoc.channelId,
          userId: messageDoc.userId,
          content: messageDoc.content,
          timestamp: messageDoc.timestamp,
          type: messageDoc.type,
          chatCompletionRequestMessage: messageDoc.chatCompletionRequestMessage
        })
        channel.messages.push(message)
      }
    }
  }
})()

const app = express()
// get post body too
const port = 3005
app.get('/ping', (req, res) => {
  res.send('pong')
})

// Use JSON parser for all non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === '/stripe') {
    next()
  } else {
    bodyParser.json()(req, res, next)
  }
})

// use raw payload for stripe
// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.post('/stripe', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const result = await handleWebHook(req, res, guilds)
  if (!result.success) {
    res.status(500).send('Error')
    return
  }

  if (result.channelId === undefined || result.tokens === undefined) {
    res.status(500).send('Error')
    return
  }

  // get the channel and send a message
  const channel = await client.channels.fetch(result.channelId)
  if (channel instanceof TextChannel) {
    if ((result.anonymous ?? false) || result.userId == null || result.userId.length === 0) {
      await channel.send('An anonymous user purchased ' +
        `${result.tokens.toLocaleString()} tokens for ${result.type ?? ''}`)
    } else {
      await channel.send(`<@${result.userId}> purchased ` +
      `${result.tokens.toLocaleString()} tokens for ${result.type ?? ''}!`)
    }
  }
  res.send('Success')
})

client.once(Events.ClientReady, async () => {
  console.log('Ready!')

  // register commands
  await RegisterCommands(client)
})

// // register commands to the their handlers
const commands = new Map<
string,
(interaction: CommandInteraction) => Promise<void>
>()
commands.set('config', async (interaction) => {
  if (interaction.guildId == null) {
    await interaction.reply({
      content: 'This command can only be used in a server',
      ephemeral: true
    })
    return
  }
  // pull out the options
  const onlyMentions = interaction.options.get('only_mentions')?.value as boolean ?? true
  const ignoreBots = interaction.options.get('ignore_bots')?.value as boolean ?? true
  const ignoreEveryoneMentions =
    interaction.options.get('ignore_everyone_mentions')?.value as boolean ?? true
  const languageModel = interaction.options.get('language_model')?.value as string ??
     'gpt-3.5-turbo'

  const configPartial: Partial<ChannelConfig> = {
    ONLY_RESPOND_TO_MENTIONS: onlyMentions ?? true,
    IGNORE_BOTS: ignoreBots,
    IGNORE_EVERYONE_MENTIONS: ignoreEveryoneMentions,
    LANGUAGE_MODEL: languageModel
  }

  console.log('Configuring channel: ' + interaction.channelId)
  console.log('Config: ' + JSON.stringify(configPartial))

  // get the guild
  let guild = guilds.get(interaction.guildId)

  // if the guild doesn't exist, create it
  if (guild == null) {
    guild = new Guild(interaction.guildId, DEFAULT_GUILD_CONFIG)
    guilds.set(interaction.guildId, guild)
  }

  // get the channel config
  let channel = guild.channels.get(interaction.channelId)
  // update the channel config
  if (channel == null) {
    const channelConfig = {
      ...DEFAULT_GUILD_CONFIG,
      ...configPartial
    }
    channel = new Channel(
      interaction.channelId,
      interaction.guildId,
      channelConfig
    )
    guild.channels.set(interaction.channelId, channel)
  } else {
    channel.config = {
      ...channel.config,
      ...configPartial
    }
  }
  await channel.save()
  await interaction.reply({
    content: 'Channel configured with the following settings: \n' +
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `\`ONLY_RESPOND_TO_MENTIONS\`: ${channel.config.ONLY_RESPOND_TO_MENTIONS}\n` +
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `\`IGNORE_BOTS\`: ${channel.config.IGNORE_BOTS}\n` +
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `\`IGNORE_EVERYONE_MENTIONS\`: ${channel.config.IGNORE_EVERYONE_MENTIONS}\n` +
      `\`LANGUAGE_MODEL\`: ${channel.config.LANGUAGE_MODEL}`
  })
})

commands.set('tokens', async (interaction) => {
  if (interaction.guildId == null) {
    await interaction.reply({
      content: 'This command can only be used in a server',
      ephemeral: true
    })
    return
  }
  const guild = guilds.get(interaction.guildId)
  if (guild == null) {
    await interaction.reply({
      content: 'This server does not have any configuration',
      ephemeral: true
    })
    return
  }
  // format the numbers in a nice way
  const gpt3Tokens = guild.gpt3TokensAvailable.toLocaleString()
  const gpt4Tokens = guild.gpt4TokensAvailable.toLocaleString()

  const tokenUrl = await generateCheckout(
    interaction.guildId,
    interaction.guild?.name ?? '',
    interaction.user.id,
    interaction.channelId
  )

  await interaction.reply({
    content: `Tokens Remaining: \nGPT-3: ${gpt3Tokens}` +
      `\nGPT-4: ${gpt4Tokens}\n\n[Buy more tokens for this server](${tokenUrl})`,
    ephemeral: true
  })
})

commands.set('reset', async (interaction) => {
  if (interaction.guildId == null) {
    await interaction.reply({
      content: 'This command can only be used in a server',
      ephemeral: true
    })
    return
  }
  const guild = guilds.get(interaction.guildId)
  if (guild == null) {
    await interaction.reply({
      content: 'This server does not have any configuration',
      ephemeral: true
    })
    return
  }
  const channel = guild.channels.get(interaction.channelId)
  if (channel == null) {
    await interaction.reply({
      content: 'This channel does not have any configuration',
      ephemeral: true
    })
    return
  }

  const type = interaction.options.get('reset_type')?.value as string

  if (type == null) {
    await interaction.reply({
      content: 'Please specify a reset type',
      ephemeral: true
    })
    return
  }

  if (type === 'all') {
    channel.clearMessages()
  }

  if (type === 'user') {
    channel.removeMessagesByType(ChatCompletionResponseMessageRoleEnum.User)
  }
  if (type === 'bot') {
    channel.removeMessagesByType(ChatCompletionResponseMessageRoleEnum.Assistant)
  }
  if (type === 'system') {
    channel.removeMessagesByType(ChatCompletionResponseMessageRoleEnum.System)
  }
  await interaction.reply({
    content: `${type.toUpperCase()} messages have been cleared by <@${interaction.user.id}>`
  })
})

commands.set('system', async (interaction) => {
  if (interaction.guildId == null) {
    await interaction.reply({
      content: 'This command can only be used in a server',
      ephemeral: true
    })
    return
  }
  const guild = guilds.get(interaction.guildId)
  if (guild == null) {
    await interaction.reply({
      content: 'This server does not have any configuration',
      ephemeral: true
    })
    return
  }
  const channel = guild.channels.get(interaction.channelId)
  if (channel == null) {
    await interaction.reply({
      content: 'This channel does not have any configuration. Run `/config`',
      ephemeral: true
    })
    return
  }
  const message = interaction.options.get('message')?.value as string

  // if the subcommand was list, list the system messages
  // @ts-expect-error - this is a bug in the types
  const list = interaction.options.getSubcommand() === 'list'

  if (list) {
    const messages =
      channel.messages.filter(
        (x) => x.chatCompletionRequestMessage.role === ChatCompletionResponseMessageRoleEnum.System)
    const messageList = messages.map((m) => m.content).join('\n')
    await interaction.reply({
      content: `System messages: \n${messageList}`
    })
    return
  }
  if (message == null) {
    await interaction.reply({
      content: 'Please provide a message',
      ephemeral: true
    })
    return
  }
  const systemMessage = {
    content: message,
    role: ChatCompletionResponseMessageRoleEnum.System,
    name: client.user?.id
  }

  const newMessage = new Message({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    content: message,
    timestamp: interaction.createdTimestamp,
    type: ChatCompletionResponseMessageRoleEnum.System,
    userId: client.user?.id ?? '',
    chatCompletionRequestMessage: systemMessage
  })

  await channel.addMessage(newMessage)
  await interaction.reply({
    content: `System message added by <@${interaction.user.id}>: \n${message}`
  })
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isCommand()) {
    // register handlers in the commands
    const command = commands.get(interaction.commandName)
    if (command == null) {
      console.log('Command not found: ' + interaction.commandName)
      return
    }
    try {
      await command(interaction)
    } catch (error) {
      console.error(error)
      await interaction.reply({
        content: 'An error occurred while processing this command',
        ephemeral: true
      })
    }
  }
})

client.on(Events.MessageCreate, async (message) => {
  if (message.guildId == null) return
  if (client.user?.id == null || message.channelId == null) return
  if (message.author.id === client.user.id) return

  console.log(message.author.username + ': ' + message.content)

  let guild = guilds.get(message.guildId)
  if (guild == null) {
    console.log('Guild not found, creating new one')
    guild = new Guild(message.guildId, DEFAULT_GUILD_CONFIG)
    guilds.set(message.guildId, guild)
    await guild.save()
  }

  const channel = await guild.getChannel(message.channelId)

  if (channel == null) {
    if (message.mentions.users.has(client.user.id)) {
      await message.reply(
        'This channel is not configured for chatting with me.  ' +
        'Someone with permissions needs to run `/config` to configure this channel.')
    }
    return
  }

  const newMessage = new Message({
    id: message.id,
    guildId: message.guildId,
    channelId: message.channelId,
    userId: message.author.id,
    timestamp: message.createdTimestamp,
    type: ChatCompletionRequestMessageRoleEnum.User,
    content: message.content,
    chatCompletionRequestMessage: {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message.content,
      name: message.author.id.toString()
    }
  })

  await channel.addMessage(newMessage)

  // also ignore @everyone or role mentions
  if (
    (message.mentions.everyone || message.mentions.roles.size > 0) &&
    channel.config.IGNORE_EVERYONE_MENTIONS
  ) {
    console.log('Ignoring @everyone or role mention')
    return
  }

  // also ignore all bots.. we don't want to get into a loop
  if (message.author.bot && channel.config.IGNORE_BOTS) {
    console.log('Ignoring bot message')
    return
  }

  console.log('Existing messages: ' + channel.messages.length.toString())

  if (
    !message.mentions.has(client.user) &&
    channel.config.ONLY_RESPOND_TO_MENTIONS
  ) {
    console.log('Message does not mention bot, ignoring')
    return
  }

  // if there were mentions that don't include us, ignore
  if (message.mentions.users.size > 0 && !message.mentions.has(client.user)) {
    console.log('Message mentions other users, ignoring')
    return
  }

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

    // ensure the message is appropriate
    const badIndices = await openAiHelper.findModerationIndices(
      channel.messages.map((message) => message.content)
    )

    if (badIndices.length > 0) {
      // remove any messages that were flagged
      badIndices
        .sort((a, b) => b - a)
        .forEach((index) => {
          channel.messages.splice(index, 1)
        })
      clearInterval(typingInterval)
      await message.reply(channel.config.MODERATION_VIOLATION)
      return
    }

    console.log('Generating completion... messages in history')

    // subtract from the guild's token count
    if (channel.config.LANGUAGE_MODEL.toLowerCase() === 'gpt-4') {
      try {
        await guild.subtractGpt4Tokens(channel.countTotalTokens())
      } catch (error) {
        console.error(error)
        await message.reply('Sorry, you have run out of GPT-4 tokens')
        clearInterval(typingInterval)
        return
      }
    } else {
      try {
        await guild.subtractGpt3Tokens(channel.countTotalTokens())
      } catch (error) {
        console.error(error)
        await message.reply('Sorry, you have run out of GPT-3 tokens')
        clearInterval(typingInterval)
        return
      }
    }

    let response = await openAiHelper.createChatCompletion(
      channel.messages.map((message) => message.chatCompletionRequestMessage),
      channel.config.LANGUAGE_MODEL,
      message.author.id
    )

    // let's ensure our own response doesn't violate any moderation
    // rules
    if ((await openAiHelper.findModerationIndices([response])).length > 0) {
      console.log('Response flagged: ' + response)
      clearInterval(typingInterval)
      await message.reply(channel.config.MODERATION_VIOLATION)
      return
    }

    const newMessage = new Message({
      guildId: message.guildId,
      channelId: message.channelId,
      userId: client.user.id,
      timestamp: Date.now(),
      type: ChatCompletionRequestMessageRoleEnum.Assistant,
      content: response,
      chatCompletionRequestMessage: {
        role: ChatCompletionRequestMessageRoleEnum.Assistant,
        content: response,
        name: client.user.id.toString()
      }
    })

    await channel.addMessage(newMessage)

    console.log('Response: ' + response)

    // if this is the first assistant message, send the disclaimer first
    if (!channel.disclaimerSent && channel.config.DISCLAIMER.length > 0) {
      channel.setDisclaimerSent(true)
      response = channel.config.DISCLAIMER + '\n\n' + response
      console.log('Adding disclaimer')
    }

    // if the message is too long, split it up into max of 2000
    // characters per message
    // split up the messsage into each 2000 character chunks
    const chunks = response.match(/[\s\S]{1,2000}/g)
    clearInterval(typingInterval)
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
    await message.reply(channel.config.ERROR_RESPONSE)
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
    // print how many servers we're in
    console.log(
      `Connected to ${client.guilds.cache.size} ` +
      `server(s) with ${client.guilds.cache.reduce(
        (a, g) => a + g.memberCount,
        0
      )} user(s)`
    )
  })
  .catch((e) => {
    console.error(e)
  })

// add express endpoint to handle stripe payments

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
