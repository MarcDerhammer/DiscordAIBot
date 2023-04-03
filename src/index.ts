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
import generateCheckout, { handleWebHook, TOKEN_TYPE } from './stripe/Checkout'
import express from 'express'
import bodyParser from 'body-parser'
import { Message } from './messages/Message'
import { mongoClient } from './mongo/MongoClient'
import { Ntfy } from './ntfy/Ntfy'
import { log } from './logger'

const API_KEY = getEnv('API_KEY')
const DISCORD_TOKEN = getEnv('DISCORD_TOKEN')
const ADMIN_API_KEY = getEnv('ADMIN_API_KEY')
const NTFY_TOPIC = getEnv('NTFY_TOPIC')

export const ntfy = new Ntfy(NTFY_TOPIC)

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
  const guildsCursor = guildsCollection.find()
  const guildsDocs = await guildsCursor.toArray()
  for (const guildDoc of guildsDocs) {
    const guild = new Guild(
      guildDoc.id,
      guildDoc.config,
      guildDoc.gpt3TokensAvailable,
      guildDoc.gpt4TokensAvailable
    )
    guilds.set(guild.id, guild)
    // now look up all the channels for this guild
    const channelsCollection = mongoClient.db('discord').collection('channels')

    // query where guildId = guild.id
    const channelsCursor = channelsCollection.find({ guildId: guild.id })
    const channelsDocs = await channelsCursor.toArray()

    // Process the channels as needed
    for (const channelDoc of channelsDocs) {
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
      const messagesCursor = messagesCollection.find({ channelId: channelDoc.id })
      const messagesDocs = await messagesCursor.toArray()

      // Process the messages as needed
      for (const messageDoc of messagesDocs) {
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
  void ntfy.publish('Stripe Payment Received', 'A payment was received!!', 'moneybag')
  await handleWebHook(req, res, guilds, client)
})

// an admin post that accepts the following body:
// the api key must be set in a header
// all are optional:
// guildId,
// channelId,
// message
// gpt-4-tokens
// gpt-3-tokens
// this allows an admin to adjust remaining tokenks for a guild
// and send a message to the channel explaining
// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.post('/admin', async (req, res) => {
  try {
    if (ADMIN_API_KEY == null || ADMIN_API_KEY.length === 0) {
      res.status(401).send('Unauthorized')
      return
    }
    const apiKey = req.headers['api-key']

    if (apiKey === null || apiKey === undefined || apiKey !== ADMIN_API_KEY) {
      res.status(401).send('Unauthorized')
      return
    }

    const guildId = req.body.guildId
    const channelId = req.body.channelId
    const message = req.body.message
    const gpt4Tokens = req.body.gpt4Tokens
    const gpt3Tokens = req.body.gpt3Tokens

    if (guildId == null) {
      res.status(400).send('GuildId is required')
      return
    }

    const guild = guilds.get(guildId as string)
    if (guild == null) {
      res.status(400).send('Guild not found')
      return
    }

    if (gpt4Tokens != null) {
      guild.gpt4TokensAvailable += gpt4Tokens as number
      log({
        guildId: guildId as string,
        message: `/admin POST added ${gpt4Tokens as string} GPT-4 Tokens ${guildId as string}`,
        channelId: channelId as string
      })
      await guild.save()
    }

    if (gpt3Tokens != null) {
      guild.gpt3TokensAvailable += gpt3Tokens as number
      log({
        guildId: guildId as string,
        message: `/admin POST added ${gpt3Tokens as string} GPT-3 Tokens ${guildId as string}`,
        channelId: channelId as string
      })
      await guild.save()
    }

    if (channelId != null) {
      if (message != null) {
        const channel = await client.channels.fetch(channelId)
        const messagePrefix = '`[Message from Developer]`\n'
        if (channel instanceof TextChannel) {
          await channel.send(messagePrefix + (message as string))
          log({
            guildId: guildId as string,
            message: `${messagePrefix} ${message as string}`,
            channelId: channelId as string
          })
        } else {
          log({
            guildId: guildId as string,
            message: `Unable to send message to channel ${channelId as string}`,
            channelId: channelId as string,
            level: 'error'
          })
        }
      }
    }
    res.send('ok')
  } catch (e) {
    log({
      message: e,
      level: 'error'
    })
    res.status(500).send('Internal Server Error')
  }
})

client.once(Events.ClientReady, async () => {
  log({
    message: 'Bot is ready ready!',
    level: 'info'
  })

  // register commands
  await RegisterCommands(client)
})

// // register commands to the their handlers
const commands = new Map<
string,
(interaction: CommandInteraction) => Promise<void>
>()
commands.set('who', async (interaction) => {
  // print the configuration options and print any system messages that are currently set
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
      content: 'This command can only be used in a server',
      ephemeral: true
    })
    return
  }

  const channel = guild.channels.get(interaction.channelId)
  if (channel == null) {
    await interaction.reply({
      content: 'This channel is not configured',
      ephemeral: true
    })
    return
  }

  const messages =
      channel.messages.filter(
        (x) => x.chatCompletionRequestMessage.role === ChatCompletionResponseMessageRoleEnum.System)
  const messageList = messages.map((m) => m.content.slice(0, 500)).join('\n • ')

  const response = 'Channel configured with the following settings: \n' +
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    `\`ONLY_RESPOND_TO_MENTIONS\`: ${channel.config.ONLY_RESPOND_TO_MENTIONS}\n` +
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    // `\`IGNORE_BOTS\`: ${channel.config.IGNORE_BOTS}\n` +
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    `\`IGNORE_EVERYONE_MENTIONS\`: ${channel.config.IGNORE_EVERYONE_MENTIONS}\n` +
    `\`LANGUAGE_MODEL\`: ${channel.config.LANGUAGE_MODEL}` +
    `\n\nSystem messages (${messages.length}): \n • ${messageList}`
  
  await interaction.reply({
    content: response.slice(0, 2000),
    ephemeral: true
  })
})
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
  // const ignoreBots = interaction.options.get('ignore_bots')?.value as boolean ?? true
  const ignoreEveryoneMentions =
    interaction.options.get('ignore_everyone_mentions')?.value as boolean ?? true
  const languageModel = interaction.options.get('language_model')?.value as string ??
     'gpt-3.5-turbo'

  const configPartial: Partial<ChannelConfig> = {
    ONLY_RESPOND_TO_MENTIONS: onlyMentions ?? true,
    IGNORE_BOTS: true,
    IGNORE_EVERYONE_MENTIONS: ignoreEveryoneMentions,
    LANGUAGE_MODEL: languageModel
  }

  log({
    guildId: interaction.guildId,
    message: `Configuring channel ${interaction.channelId} with ${JSON.stringify(configPartial)}`,
    channelId: interaction.channelId
  })

  // get the guild
  let guild = guilds.get(interaction.guildId)

  // if the guild doesn't exist, create it
  if (guild == null) {
    guild = new Guild(interaction.guildId, DEFAULT_GUILD_CONFIG)
    guilds.set(interaction.guildId, guild)
    void ntfy.publish('New Server', 'A new server has been added to the bot', 'partying_face')
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
      // `\`IGNORE_BOTS\`: ${channel.config.IGNORE_BOTS}\n` +
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `\`IGNORE_EVERYONE_MENTIONS\`: ${channel.config.IGNORE_EVERYONE_MENTIONS}\n` +
      `\`LANGUAGE_MODEL\`: ${channel.config.LANGUAGE_MODEL}`
  })
})

commands.set('tokens', async (interaction) => {
  log({
    guildId: interaction.guildId ?? undefined,
    message: `Tokens command from ${interaction.user.id}`,
    channelId: interaction.channelId
  })
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

  const gpt3checkout = await generateCheckout(
    interaction.guildId,
    interaction.guild?.name ?? '',
    interaction.user.id,
    interaction.channelId,
    TOKEN_TYPE.GPT_3
  )

  const gpt4checkout = await generateCheckout(
    interaction.guildId,
    interaction.guild?.name ?? '',
    interaction.user.id,
    interaction.channelId,
    TOKEN_TYPE.GPT_4
  )

  await interaction.reply({
    content: `Tokens Remaining: \n\`GPT-3: ${gpt3Tokens}\`` +
      `\n\`GPT-4: ${gpt4Tokens}\`\n\nBuy more: [GPT-3](${gpt3checkout}) - ` +
      `[GPT-4](${gpt4checkout})\n` +
      '\n[Pricing](https://discordai.chat/pricing)\n' +
      'Note: GPT-4 is more powerful, but also more expensive.  Tokens are shared with the entire ' +
      'server.\n\n' +
      '[What\'s a token?]' +
      '(https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them)',
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
      content: 'This server does not have any configuration. Use `/config` to set it up.',
      ephemeral: true
    })
    return
  }
  const channel = guild.channels.get(interaction.channelId)
  if (channel == null) {
    await interaction.reply({
      content: 'This channel does not have any configuration. Use `/config` to set it up.',
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
  log({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    message: `${interaction.user.id} Cleared ${type} messages`
  })
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
    const messageList = messages.map((m) => m.content.slice(0, 500)).join('\n • ')

    const response = `System messages (${messages.length}): \n • ${messageList}`
    await interaction.reply({
      content: response.slice(0, 2000),
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

  // wait for moderation check
  const moderationCheck = await openAiHelper.findFlaggedMessages([message])
  if (moderationCheck.length > 0) {
    log({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      message: `${interaction.user.id} Tried to add system message: ${message} but it was flagged`
    })
    await interaction.reply({
      content: 'This message was flagged by the moderation system.',
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
  log({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    message: `${interaction.user.id} Added system message: ${message}`
  })
  const response = `System message added by <@${interaction.user.id}>: \n${message}`
  await interaction.reply({
    content: response.slice(0, 2000)
  })
})

commands.set('help', async (interaction) => {
  await interaction.reply({
    content: 'Commands: \n' +
      '`/tokens `Check how many tokens this server has left and links to buy more \n' +
      '`/config `Configure the bot for this channel (Admin only) \n' +
      '`/reset  `Reset the bot for this channel (Admin only)\n' +
      '`/system `Add a system message to the bot (Admin only) \n' +
      '`/help   `Show this message',
    ephemeral: true
  })
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isCommand()) {
    // register handlers in the commands
    const command = commands.get(interaction.commandName)
    if (command == null) return
    try {
      await command(interaction)
    } catch (error) {
      log({
        guildId: interaction.guildId ?? undefined,
        channelId: interaction.channelId,
        message: `Error processing command ${interaction.commandName}: ${error as string}`
      })
      await interaction.reply({
        content: 'An error occurred while processing this command',
        ephemeral: true
      })
    }
  }
})

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.guildId == null) return
    if (client.user?.id == null || message.channelId == null) return
    if (message.author.id === client.user.id) return

    log({
      guildId: message.guildId,
      channelId: message.channelId,
      message: `${message.author.username}: ${message.content}`
    })

    let guild = guilds.get(message.guildId)
    if (guild == null) {
      log({
        guildId: message.guildId,
        channelId: message.channelId,
        message: 'Guild not found, creating new one'
      })
      guild = new Guild(message.guildId, DEFAULT_GUILD_CONFIG)
      guilds.set(message.guildId, guild)
      await guild.save()
      void ntfy.publish('New Server', 'A new server has been added to the bot', 'partying_face')
    }

    const channel = await guild.getChannel(message.channelId)

    if (channel == null) {
      if (message.mentions.users.has(client.user.id)) {
        log({
          guildId: message.guildId,
          channelId: message.channelId,
          message: 'Channel not found, but mentioned, replying with /config message'
        })
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
    if ((message.mentions.everyone || message.mentions.roles.size > 0) &&
      channel.config.IGNORE_EVERYONE_MENTIONS) return

    // also ignore all bots.. we don't want to get into a loop
    if (message.author.bot && channel.config.IGNORE_BOTS) return
    if (!message.mentions.has(client.user) && channel.config.ONLY_RESPOND_TO_MENTIONS) {
      return
    }

    // if there were mentions that don't include us, ignore
    if (message.mentions.users.size > 0 && !message.mentions.has(client.user)) {
      log({
        guildId: message.guildId,
        channelId: message.channelId,
        message: 'Message has mentions, but not us, ignoring'
      })
      return
    }

    await message.channel.sendTyping()
    // continulously send typing while waiting for the completion
    const typingInterval = setInterval(() => {
      message.channel
        .sendTyping()
        .then(() => {
          log({
            guildId: message.guildId ?? undefined,
            channelId: message.channelId,
            message: 'Sent typing...'
          })
        })
        .catch(() => {
          log({
            guildId: message.guildId ?? undefined,
            channelId: message.channelId,
            message: 'Error sending typing',
            level: 'error'
          })
        })
    }, 5000)

    try {
      // ensure the message is appropriate
      const badMessages = await openAiHelper.findFlaggedMessages(
        channel.messages.map((message) => message.content)
      )

      if (badMessages.length > 0) {
        // remove any messages that were flagged
        badMessages.forEach((badMessage) => {
          const message = channel.messages.find((message) => message.content === badMessage)
          if (message != null) {
            log({
              guildId: message.guildId,
              channelId: message.channelId,
              message: `Message flagged as inappropriate: ${message.content}`
            })
            void message.delete()
          }
        })

        channel.messages = channel.messages.filter(
          (message) => !badMessages.includes(message.content)
        )

        clearInterval(typingInterval)
        await message.reply(channel.config.MODERATION_VIOLATION)
        log({
          guildId: message.guildId,
          channelId: message.channelId,
          message: 'Moderation violation! Ignoring message'
        })
        return
      }

      // lastly ensure the guild is at least one week old to prevent abuse
      if (((message.guild?.createdTimestamp) == null) ||
        message.guild.createdTimestamp > Date.now() - 1000 * 60 * 60 * 24 * 7) {
        log({
          guildId: message.guildId,
          channelId: message.channelId,
          message: 'Server is less than one week old, ignoring message'
        })
        await message.reply('Sorry. To prevent abuse, your server must be at ' +
          'least one week old to use this bot')
        clearInterval(typingInterval)
        return
      }

      if (channel.config.LANGUAGE_MODEL.toLowerCase() === 'gpt-4') {
        if (guild.gpt4TokensAvailable <= 0) {
          log({
            guildId: message.guildId,
            channelId: message.channelId,
            message: 'No tokens available for GPT-4'
          })
          await message.reply('Sorry, you have run out of GPT-4 tokens. `/tokens` to get more or ' +
        '`/config` to switch to GPT-3')
          clearInterval(typingInterval)
          guild.gpt4TokensAvailable = 0
          await guild.save()
          return
        }
      } else {
        if (guild.gpt3TokensAvailable <= 0) {
          log({
            guildId: message.guildId,
            channelId: message.channelId,
            message: 'No tokens available for GPT-3'
          })
          await message.reply('Sorry, you have run out of GPT-3 tokens. `/tokens` to get more')
          guild.gpt3TokensAvailable = 0
          clearInterval(typingInterval)
          await guild.save()
          return
        }
      }

      log({
        guildId: message.guildId,
        channelId: message.channelId,
        message: `Creating completion with prompt tokens: ${channel.countTotalTokens()}`
      })

      let response = await openAiHelper.createChatCompletion(
        channel.messages.map((message) => message.chatCompletionRequestMessage),
        channel.config.LANGUAGE_MODEL,
        message.author.id
      )

      // subtract from the guild's token count
      if (channel.config.LANGUAGE_MODEL.toLowerCase() === 'gpt-4') {
        try {
          await guild.subtractGpt4Tokens(channel.countTotalTokens())
        } catch (error) {
          log({
            guildId: message.guildId,
            channelId: message.channelId,
            message: 'Error subtracting tokens' + (error as string),
            level: 'error'
          })
          return
        }
      } else {
        try {
          await guild.subtractGpt3Tokens(channel.countTotalTokens())
        } catch (error) {
          log({
            guildId: message.guildId,
            channelId: message.channelId,
            message: 'Error subtracting tokens' + (error as string),
            level: 'error'
          })
          return
        }
      }

      // let's ensure our own response doesn't violate any moderation
      // rules
      if ((await openAiHelper.findFlaggedMessages([response])).length > 0) {
        log({
          guildId: message.guildId,
          channelId: message.channelId,
          message: 'Moderation violation (from our own response...): ' + response
        })
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

      log({
        guildId: message.guildId,
        channelId: message.channelId,
        message: 'AI Response: ' + response
      })

      // if this is the first assistant message, send the disclaimer first
      if (!channel.disclaimerSent && channel.config.DISCLAIMER.length > 0) {
        channel.setDisclaimerSent(true)
        response = channel.config.DISCLAIMER + '\n\n' + response
        log({
          guildId: message.guildId,
          channelId: message.channelId,
          message: 'Adding Disclaimer to message'
        })
        await channel.save()
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
      log({
        guildId: message.guildId,
        channelId: message.channelId,
        message: 'Error: ' + (e as string),
        level: 'error'
      })
      await message.reply(channel.config.ERROR_RESPONSE)
    } finally {
      clearInterval(typingInterval)
    }
  } catch (e) {
    log({
      guildId: message.guildId ?? undefined,
      channelId: message.channelId,
      message: 'Error: ' + (e as string),
      level: 'error'
    })
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
    await ntfy.publish('Discord AI Bot Started', 'The server has started', 'robot')
    log({
      message: `Connected to ${client.guilds.cache.size} `
    })
  })
  .catch((e) => {
    log({
      message: 'Error: ' + (e as string),
      level: 'error'
    })
    void ntfy.publish('The server has failed to start', 'Discord AI Bot Failed to Start', 'robot')
  })

// add express endpoint to handle stripe payments

app.listen(port, () => {
  log({
    message: `Express listening at http://localhost:${port}`
  })
})
