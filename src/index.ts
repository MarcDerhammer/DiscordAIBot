import {
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi
} from 'openai'

import {
  Client,
  Events,
  GatewayIntentBits
} from 'discord.js'
import { getEnv } from './env'

import {
  OpenAiHelper
} from './OpenAiHelper'
import { Channel } from './messages/Channel'

const API_KEY = getEnv('API_KEY')
const DISCORD_TOKEN = getEnv('DISCORD_TOKEN')
const LANGUAGE_MODEL = getEnv('LANGUAGE_MODEL')
const ERROR_RESPONSE = getEnv('ERROR_RESPONSE')
const MODERATION_VIOLATION = getEnv('MODERATION_VIOLATION')
const SYSTEM_MESSAGE = getEnv('SYSTEM_MESSAGE')
const BOT_NAME = getEnv('BOT_NAME')
const BOT_IMAGE_URL = getEnv('BOT_IMAGE_URL')
const CHANNEL_IDS =
  getEnv('ONLY_RESPOND_IN_CHANNEL') === ''
    ? []
    : getEnv('ONLY_RESPOND_IN_CHANNEL').split(',')

const ONLY_RESPOND_TO_MENTIONS =
  getEnv('ONLY_RESPOND_TO_MENTIONS').toLowerCase() === 'true' ||
  getEnv('ONLY_RESPOND_TO_MENTIONS') === ''
const IGNORE_BOTS = getEnv('IGNORE_BOTS').toLowerCase() === 'true'
const IGNORE_EVERYONE = getEnv('IGNORE_EVERYONE').toLowerCase() === 'true'
const DISCLAIMER = getEnv('DISCLAIMER')

const TOTAL_MAX_TOKENS =
  getEnv('MAX_TOKENS_PER_MESSAGE') !== ''
    ? parseInt(getEnv('MAX_TOKENS_PER_MESSAGE'), 10)
    : undefined

const openAiHelper = new OpenAiHelper(
  new OpenAIApi(
    new Configuration({
      apiKey: API_KEY
    })
  ),
  LANGUAGE_MODEL
)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

// const COMMAND_PERMISSIONS = [
//   PermissionFlagsBits.Administrator,
//   PermissionFlagsBits.ManageMessages,
//   PermissionFlagsBits.ManageChannels,
//   PermissionFlagsBits.ManageGuild,
//   PermissionFlagsBits.ModerateMembers
// ]

client.once(Events.ClientReady, async () => {
  console.log(
    `Ready!  Using model: ${LANGUAGE_MODEL} and system message ` +
      `${SYSTEM_MESSAGE}`
  )
  // await client.application?.commands.create({
  //   name: 'reset',
  //   description: 'Reset the current conversation',
  //   defaultMemberPermissions: COMMAND_PERMISSIONS
  // })
  // await client.application?.commands.create({
  //   name: 'system',
  //   description: 'Add a system message',
  //   defaultMemberPermissions: COMMAND_PERMISSIONS
  // })
})

// // register commands to the their handlers
// const commands = new Map<
// string,
// (interaction: CommandInteraction) => Promise<void>
// >()
// commands.set('reset', async (interaction) => {
//   const row = new ActionRowBuilder()
//     .addComponents(
//       new ButtonBuilder()
//         .setCustomId('reset_all')
//         .setLabel('Clear All')
//         .setStyle(ButtonStyle.Danger)
//     )
//     .addComponents(
//       new ButtonBuilder()
//         .setCustomId('reset_user')
//         .setLabel('Clear User Messages')
//         .setStyle(ButtonStyle.Danger)
//     )
//     .addComponents(
//       new ButtonBuilder()
//         .setCustomId('reset_system')
//         .setLabel('Clear System Messages')
//         .setStyle(ButtonStyle.Danger)
//     )
//     .addComponents(
//       new ButtonBuilder()
//         .setCustomId('reset_bot_messages')
//         .setLabel('Clear Bot Messages')
//         .setStyle(ButtonStyle.Danger)
//     )

//   await interaction.reply({
//     content: 'Reset this conversation? This will remove the messages from my memory.',
//     // @ts-expect-error this is fine
//     components: [row]
//   })
// })

// commands.set('system', async (interaction) => {
//   const modal = new ModalBuilder()
//     .setTitle('Add a system message')
//     .setCustomId('add_system_message')

//   const systemMessageInput = new TextInputBuilder()
//     .setCustomId('system_message')
//     .setPlaceholder(
//       'Enter a system message. This will be sent as a "system" message to the bot.'
//     )
//     .setLabel('System message')
//     .setStyle(TextInputStyle.Paragraph)

//   const firstActionRow = new ActionRowBuilder().addComponents(
//     systemMessageInput
//   )

//   // @ts-expect-error this is fine
//   modal.addComponents(firstActionRow)

//   // prompt user for the system message
//   // add another command prompt for the system message
//   await interaction.showModal(modal)
// })

// client.on(Events.InteractionCreate, async (interaction) => {
//   if (!interaction.isButton()) {
//     return
//   }

//   if (interaction.customId === 'reset_all') {
//     const groupId = interaction.channelId.toString()
//     messages.clearMessages(groupId)
//     await interaction.reply({
//       content: `The conversation was reset by <@${interaction.user.id}>`
//     })
//   }
//   if (interaction.customId === 'reset_user') {
//     const groupId = interaction.channelId.toString()
//     messages.removeAllUserMessages(groupId)
//     await interaction.reply({
//       content: `The user messages were reset by <@${interaction.user.id}>`
//     })
//   }
//   if (interaction.customId === 'reset_system') {
//     const groupId = interaction.channelId.toString()
//     messages.removeAllSystemMessages(groupId)
//     await interaction.reply({
//       content: `The system messages were reset by <@${interaction.user.id}>`
//     })
//   }
//   if (interaction.customId === 'reset_bot_messages') {
//     const groupId = interaction.channelId.toString()
//     messages.removeAllBotMessages(groupId)
//     await interaction.reply({
//       content: `The bot messages were reset by <@${interaction.user.id}>`
//     })
//   }
// })

// client.on(Events.InteractionCreate, async (interaction) => {
//   if (
//     !interaction.isModalSubmit() ||
//     interaction.customId.length === 0 ||
//     interaction.channelId == null
//   ) {
//     return
//   }

//   if (interaction.customId === 'add_system_message') {
//     const groupId = interaction.channelId.toString()
//     const systemMessage = interaction.fields.getTextInputValue('system_message')
//     if (systemMessage == null) {
//       await interaction.reply({
//         content: 'System message is null, ignoring',
//         ephemeral: true
//       })
//       return
//     }
//     messages.addMessage(groupId, {
//       role: ChatCompletionRequestMessageRoleEnum.System,
//       content: systemMessage
//     })
//     await interaction.reply({
//       content: `<@${interaction.user.id}> added a system message: ${systemMessage}`
//     })
//   }
// })

// client.on(Events.InteractionCreate, async (interaction) => {
//   if (interaction.isCommand()) {
//     // register handlers in the commands
//     const command = commands.get(interaction.commandName)
//     if (command == null) {
//       console.log('Command not found: ' + interaction.commandName)
//       return
//     }
//     try {
//       await command(interaction)
//     } catch (error) {
//       console.error(error)
//       await interaction.reply({
//         content: ERROR_RESPONSE,
//         ephemeral: true
//       })
//     }
//   }
// })

// create a Map where the key is channelId and the value is the Channel

const channels = new Map<string, Channel>()

client.on(Events.MessageCreate, async (message) => {
  if (client.user?.id == null || message.channelId == null) return
  if (message.author.id === client.user.id) return
  if (CHANNEL_IDS != null && CHANNEL_IDS.length > 0 && !CHANNEL_IDS.includes(message.channelId)) {
    return
  }

  console.log(message.author.username + ': ' + message.content)

  let channel = channels.get(message.channelId)

  if (channel == null) {
    console.log('Channel not found, creating new one')
    channel = new Channel(message.channelId, {
      ERROR_RESPONSE,
      MODERATION_VIOLATION,
      DEFAULT_SYSTEM_MESSAGE: SYSTEM_MESSAGE,
      ONLY_RESPOND_TO_MENTIONS,
      IGNORE_BOTS,
      IGNORE_EVERYONE_MENTIONS: IGNORE_EVERYONE,
      MAX_TOKENS_PER_MESSAGE:
        (TOTAL_MAX_TOKENS != null) ? TOTAL_MAX_TOKENS : Number.MAX_SAFE_INTEGER,
      DISCLAIMER
    })
    channels.set(message.channelId, channel)
  }

  await channel.addMessage({
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: message.content,
    name: message.author.id.toString()
  })

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

  if (!message.mentions.has(client.user) && channel.config.ONLY_RESPOND_TO_MENTIONS) {
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
    const inappropriate = await openAiHelper.areMessagesInappropriate(
      channel.messages.map((message) => message.content)
    )

    if (inappropriate) {
      console.log('Message flagged: ' + message.content)
      await channel.clearMessages()
      clearInterval(typingInterval)
      await message.reply(channel.config.MODERATION_VIOLATION)
      return
    }

    console.log('Generating completion... messages in history')

    let response = await openAiHelper.createChatCompletion(
      channel.messages ?? [],
      message.author.id,
      TOTAL_MAX_TOKENS
    )

    // let's ensure our own response doesn't violate any moderation
    // rules
    if (await openAiHelper.areMessagesInappropriate([response])) {
      console.log('Response flagged: ' + response)
      await channel.clearMessages()
      clearInterval(typingInterval)
      await message.reply(channel.config.MODERATION_VIOLATION)
      return
    }

    await channel.addMessage({
      role: ChatCompletionRequestMessageRoleEnum.Assistant,
      content: response,
      name: client.user.id.toString()
    })

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
    console.log(`Connected to ${client.guilds.cache.size} ` +
    `server(s) with ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} user(s)`)
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
