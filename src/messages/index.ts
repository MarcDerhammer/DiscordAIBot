import { type Message } from 'discord.js'
import { ChatCompletionRequestMessageRoleEnum } from 'openai'
import { client, guilds, ntfy, openAiHelper } from '../index'
import { log } from '../logger'
import { DEFAULT_GUILD_CONFIG, Guild } from './Guild'
import { Message as MyMessage } from './Message'

// keep a queue for each channel's messages
const messageQueue = new Map<string, Message[]>()

export function queueMessage (message: Message): void {
  if (message.channelId == null) return
  if (message.guildId == null) return

  if (messageQueue.has(message.channelId)) {
    const messages = messageQueue.get(message.channelId)
    if (messages == null) return
    messages.push(message)
  } else {
    messageQueue.set(message.channelId, [message])
    void processMessageQueue(message.channelId)
  }
}

async function processMessageQueue (channelId: string): Promise<void> {
  const messages = messageQueue.get(channelId)
  if (messages == null) return

  while (messages.length > 0) {
    const message = messages.shift()
    if (message != null) {
      await processMessage(message)
    }
  }
  messageQueue.delete(channelId)
}

async function processMessage (message: Message): Promise<void> {
  try {
    if (message.guildId == null) return
    if (client.user?.id == null || message.channelId == null) return
    if (message.author.id === client.user.id) return

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

    log({
      guildId: message.guildId,
      channelId: message.channelId,
      userId: message.author.id,
      message: `${message.author.username}: ${message.content}`
    })

    const newMessage = new MyMessage({
      id: message.id,
      guildId: message.guildId,
      channelId: message.channelId,
      user: message.author.id,
      timestamp: message.createdTimestamp,
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message.content
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
              'least one week old to use this bot. Leaving server...')
        await message.guild?.leave()
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
          await message.reply('Sorry, you have run out of GPT-4 tokens.')
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
          await message.reply('Sorry, you have run out of GPT-3 tokens')
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
        channel.messages.map((message) => ({
          role: message.role,
          content: message.content,
          name: message.user
        })),
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

      const newMessage = new MyMessage({
        guildId: message.guildId,
        channelId: message.channelId,
        user: client.user.id,
        timestamp: Date.now(),
        role: ChatCompletionRequestMessageRoleEnum.Assistant,
        content: response
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
}
