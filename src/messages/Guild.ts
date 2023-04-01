/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { type Channel } from './Channel'
import { type ChannelConfig } from './ChannelConfig'
import fs from 'fs'
import { DEFAULT_MODERATION_VIOATION_RESPONSE, DISCLAIMER } from '../env'
import { mongoClient } from '../mongo/MongoClient'

export const DEFAULT_GUILD_CONFIG: ChannelConfig = {
  MAX_TOKENS_PER_MESSAGE: Number.MAX_SAFE_INTEGER,
  ERROR_RESPONSE: 'Sorry, there was an error. Please try again later.',
  MODERATION_VIOLATION: DEFAULT_MODERATION_VIOATION_RESPONSE,
  ONLY_RESPOND_TO_MENTIONS: true,
  IGNORE_BOTS: true,
  IGNORE_EVERYONE_MENTIONS: true,
  DISCLAIMER,
  LANGUAGE_MODEL: 'gpt-3.5-turbo'
}

const GPT3_TOKENS_AVAILABLE = 2000000
const GPT4_TOKENS_AVAILABLE = 40000

const isRunningInDocker = (): boolean => {
  return fs.existsSync('/.dockerenv')
}

export const GUILD_DIRECTORY =
    isRunningInDocker() ? '/data/guilds' : './data/guilds'

export class Guild {
  id: string
  channels: Map<string, Channel>
  defaultConfig: ChannelConfig

  gpt3TokensAvailable: number
  gpt4TokensAvailable: number

  constructor (
    id: string,
    defaultConfig: ChannelConfig,
    gpt3TokensAvailable: number = GPT3_TOKENS_AVAILABLE,
    gpt4TokensAvailable: number = GPT4_TOKENS_AVAILABLE
  ) {
    this.id = id
    this.channels = new Map()
    this.gpt3TokensAvailable = gpt3TokensAvailable
    this.gpt4TokensAvailable = gpt4TokensAvailable
    this.defaultConfig = defaultConfig
  }

  async getChannel (id: string): Promise<Channel | undefined> {
    if (!this.channels.has(id)) {
      console.error('Channel not found')
      return undefined
    }
    return this.channels.get(id)
  }

  async subtractGpt3Tokens (tokens: number): Promise<void> {
    // if we ran out, error
    if (this.gpt3TokensAvailable <= 0) {
      this.gpt3TokensAvailable = 0
      throw new Error('Ran out of GPT-3 tokens')
    }
    this.gpt3TokensAvailable -= tokens
    console.log('GPT-3 tokens remaining: ' + this.gpt3TokensAvailable.toString())
    await this.save()
  }

  async subtractGpt4Tokens (tokens: number): Promise<void> {
    // if we ran out, error
    if (this.gpt4TokensAvailable <= 0) {
      this.gpt4TokensAvailable = 0
      throw new Error('Ran out of GPT-4 tokens')
    }
    this.gpt4TokensAvailable -= tokens
    console.log('GPT-4 tokens remaining: ' + this.gpt4TokensAvailable.toString())
    await this.save()
  }

  toJson (): string {
    return JSON.stringify({
      id: this.id,
      channels: Array.from(this.channels.values()).map(channel => JSON.stringify(channel)),
      gpt3TokensAvailable: this.gpt3TokensAvailable,
      gpt4TokensAvailable: this.gpt4TokensAvailable,
      defaultConfig: this.defaultConfig
    })
  }

  async save (): Promise<void> {
    const guildsCollection = mongoClient.db('discord').collection('guilds')
    await guildsCollection.updateOne(
      { id: this.id },
      {
        $set: {
          gpt3TokensAvailable: this.gpt3TokensAvailable,
          gpt4TokensAvailable: this.gpt4TokensAvailable,
          defaultConfig: this.defaultConfig
        }
      },
      { upsert: true }
    )
  }
}
