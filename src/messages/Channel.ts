import {
  ChatCompletionRequestMessageRoleEnum,
  type ChatCompletionRequestMessage
} from 'openai'
import { countTokens } from '../OpenAiHelper'
import { type ChannelConfig } from './ChannelConfig'

const EXTRA_TOKENS_BUFFER = 500

export class Channel {
  id: string
  messages: ChatCompletionRequestMessage[]
  config: ChannelConfig
  disclaimerSent: boolean

  constructor (id: string, config: ChannelConfig) {
    this.id = id
    this.messages = []
    this.config = config
    this.disclaimerSent = false
  }

  setDisclaimerSent (disclaimerSent: boolean): void {
    this.disclaimerSent = disclaimerSent
  }

  setConfig (config: ChannelConfig): void {
    this.config = config
    this.clearMessages()
  }

  addMessage (message: ChatCompletionRequestMessage): void {
    this.messages.push(message)

    while (countTokens(this.messages) + EXTRA_TOKENS_BUFFER > this.config.MAX_TOKENS_PER_MESSAGE) {
      console.log('Removing message to avoid exceeding max token count')
      // remove the first non-system message
      const index = this.messages.findIndex(
        (message) =>
          message.role !== ChatCompletionRequestMessageRoleEnum.System
      )
      this.messages.splice(index, 1)
      if (index === -1) {
        // no non-system messages found.. but we still need to break to avoid loop
        throw new Error('System messages are too long')
      }
    }
  }

  clearMessages (): void {
    console.log('Clearing conversation for channel: ' + this.id)
    // await all of these to run in parallel

    this.removeMessagesByType(ChatCompletionRequestMessageRoleEnum.User)
    this.removeMessagesByType(ChatCompletionRequestMessageRoleEnum.Assistant)
    this.removeMessagesByType(ChatCompletionRequestMessageRoleEnum.System)
  }

  removeMessagesByType (
    role: ChatCompletionRequestMessageRoleEnum
  ): void {
    this.messages = [
      ...this.messages.filter((message) => message.role !== role)
    ]
  }

  static load (json: string): Channel {
    try {
      const jsonObj = JSON.parse(json)

      const channel = new Channel(jsonObj.id, jsonObj.config)
      channel.messages = jsonObj.messages
      channel.disclaimerSent = jsonObj.disclaimerSent

      return channel
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Error loading Channel from JSON: ${e.message}`)
    }
  }
}
