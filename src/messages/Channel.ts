import {
  ChatCompletionRequestMessageRoleEnum
} from 'openai'
import { log } from '../logger'
import { mongoClient } from '../mongo/MongoClient'
import { countTokens } from '../OpenAiHelper'
import { type ChannelConfig } from './ChannelConfig'
import { type Message } from './Message'

const EXTRA_TOKENS_BUFFER = 800
const GPT_4_LIMIT = 8192
const GPT_3_LIMIT = 4096

export class Channel {
  id: string
  messages: Message[]
  config: ChannelConfig
  disclaimerSent: boolean
  guildId: string

  constructor (
    id: string,
    guildId: string,
    config: ChannelConfig,
    disclaimerSent?: boolean) {
    this.id = id
    this.messages = []
    this.config = config
    this.disclaimerSent = disclaimerSent ?? false
    this.guildId = guildId
  }

  setDisclaimerSent (disclaimerSent: boolean): void {
    this.disclaimerSent = disclaimerSent
  }

  setConfig (config: ChannelConfig): void {
    this.config = config
    this.clearMessages()
  }

  countTotalTokens (): number {
    return countTokens(this.messages.map((message) => message.chatCompletionRequestMessage))
  }

  async addMessage (message: Message): Promise<void> {
    this.messages.push(message)
    await message.save()

    while (this.countTotalTokens() + EXTRA_TOKENS_BUFFER >
      (this.config.LANGUAGE_MODEL === 'gpt-3.5-turbo'
        ? GPT_3_LIMIT
        : GPT_4_LIMIT)) {
      log({
        guildId: this.guildId,
        channelId: this.id,
        message: 'Removing message to avoid exceeding max token count'
      })
      // remove the first non-system message
      const index = this.messages.findIndex(
        (message) =>
          message.chatCompletionRequestMessage.role !== ChatCompletionRequestMessageRoleEnum.System
      )
      await this.messages[index].delete()
      this.messages.splice(index, 1)
      if (index === -1) {
        // no non-system messages found.. but we still need to break to avoid loop
        throw new Error('System messages are too long')
      }
    }
  }

  clearMessages (): void {
    log({
      guildId: this.guildId,
      channelId: this.id,
      message: 'Clearing ALL messages'
    })
    // await all of these to run in parallel
    this.removeMessagesByType(ChatCompletionRequestMessageRoleEnum.User)
    this.removeMessagesByType(ChatCompletionRequestMessageRoleEnum.Assistant)
    this.removeMessagesByType(ChatCompletionRequestMessageRoleEnum.System)
  }

  removeMessagesByType (
    role: ChatCompletionRequestMessageRoleEnum
  ): void {
    log({
      guildId: this.guildId,
      channelId: this.id,
      message: `Clearing messages of type ${role}`
    })
    this.messages = [
      ...this.messages.filter((message) => message.chatCompletionRequestMessage.role !== role)
    ]
  }

  async save (): Promise<void> {
    const channelCollection = mongoClient.db('discord').collection('channels')
    await channelCollection.updateOne(
      { id: this.id },
      {
        $set: {
          id: this.id,
          guildId: this.guildId,
          config: this.config,
          disclaimerSent: this.disclaimerSent
        }
      },
      { upsert: true }
    )
  }
}
