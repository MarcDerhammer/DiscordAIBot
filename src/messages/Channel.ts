import { ChatCompletionRequestMessageRoleEnum, type ChatCompletionRequestMessage } from 'openai'
import { countTokens } from '../OpenAiHelper'
import { type ChannelConfig } from './ChannelConfig'
import fs from 'fs'

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

  async setConfig (config: ChannelConfig): Promise<void> {
    this.config = config
    await this.clearMessages()
    await this.save()
  }

  async addMessage (message: ChatCompletionRequestMessage): Promise<void> {
    this.messages.push(message)
    while (countTokens(this.messages) > this.config.MAX_TOKENS_PER_MESSAGE) {
      console.log('Removing message to avoid exceeding max token count')
      // remove the first non-system message
      const index = this.messages.findIndex(
        (message) => message.role !== ChatCompletionRequestMessageRoleEnum.System)
      this.messages.splice(index, 1)
      if (index === -1) {
        // no non-system messages found.. but we still need to break to avoid loop
        throw new Error('System messages are too long')
      }
    }
    // save this message to file as <id>.json
    await this.save()
  }

  async clearMessages (): Promise<void> {
    console.log('Clearing conversation for channel: ' + this.id)
    // await all of these to run in parallel
    await Promise.all([
      this.removeMessagesByType(ChatCompletionRequestMessageRoleEnum.User),
      this.removeMessagesByType(ChatCompletionRequestMessageRoleEnum.Assistant),
      this.removeMessagesByType(ChatCompletionRequestMessageRoleEnum.System)
    ])
  }

  async removeMessagesByType (role: ChatCompletionRequestMessageRoleEnum): Promise<void> {
    this.messages = [...this.messages.filter(
      (message) => message.role !== role)]

    if (role === ChatCompletionRequestMessageRoleEnum.System &&
            this.config.DEFAULT_SYSTEM_MESSAGE.length > 0) {
      await this.addMessage({
        content: this.config.DEFAULT_SYSTEM_MESSAGE,
        role: ChatCompletionRequestMessageRoleEnum.System
      })
    }
  }

  async save (): Promise<void> {
    await new Promise((resolve, reject) => {
      // write files to a folder called 'channels'

      fs.writeFile(`./channels/${this.id}.json`, JSON.stringify(this), (err) => {
        if (err != null) {
          reject(err)
        } else {
          resolve(true)
        }
      })
    })
  }
}
