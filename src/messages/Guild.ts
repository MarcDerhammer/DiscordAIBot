/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { Channel } from './Channel'
import { type ChannelConfig } from './ChannelConfig'
import fs from 'fs'
import { DEFAULT_MODERATION_VIOATION_RESPONSE, DISCLAIMER } from '../env'

export const DEFAULT_GUILD_CONFIG: ChannelConfig = {
  MAX_TOKENS_PER_MESSAGE: Number.MAX_SAFE_INTEGER,
  ERROR_RESPONSE: 'Sorry, there was an error. Please try again later.',
  MODERATION_VIOLATION: DEFAULT_MODERATION_VIOATION_RESPONSE,
  DEFAULT_SYSTEM_MESSAGE: '',
  ONLY_RESPOND_TO_MENTIONS: true,
  IGNORE_BOTS: true,
  IGNORE_EVERYONE_MENTIONS: true,
  DISCLAIMER,
  LANGUAGE_MODEL: 'gpt-3.5-turbo'
}

const GPT3_TOKENS_AVAILABLE = 2000000
const GPT4_TOKENS_AVAILABLE = 80000

export const GUILD_DIRECTORY =
    // if we're in docker, it's just /data/guilds
    // otherwise, it's ./data/guilds
    (process.env.DOCKER != null) ? '/data/guilds' : './data/guilds'

export class Guild {
  id: string
  channels: Map<string, Channel>
  defaultConfig: ChannelConfig

  gpt3TokensAvailable: number
  gpt4TokensAvailable: number

  constructor (id: string, defaultConfig: ChannelConfig) {
    this.id = id
    this.channels = new Map()
    this.gpt3TokensAvailable = GPT3_TOKENS_AVAILABLE
    this.gpt4TokensAvailable = GPT4_TOKENS_AVAILABLE
    this.defaultConfig = defaultConfig
  }

  async getChannel (id: string): Promise<Channel | undefined> {
    if (!this.channels.has(id)) {
      this.channels.set(id, new Channel(id, this.defaultConfig))
      await this.save()
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
    await new Promise((resolve, reject) => {
      if (!fs.existsSync(GUILD_DIRECTORY)) {
        fs.mkdirSync(GUILD_DIRECTORY)
      }
      // write files to a folder called 'channels'
      fs.writeFile(
        `${GUILD_DIRECTORY}/${this.id}.json`,
        this.toJson(),
        (err) => {
          if (err != null) {
            reject(err)
          } else {
            resolve(true)
          }
        }
      )
    })
  }

  static async load (json: string): Promise<Guild> {
    try {
      const jsonObj = JSON.parse(json)

      const guild = new Guild(jsonObj.id, jsonObj.defaultConfig)
      guild.gpt3TokensAvailable = jsonObj.gpt3TokensAvailable
      guild.gpt4TokensAvailable = jsonObj.gpt4TokensAvailable
      jsonObj.channels.forEach((channelJson: string) => {
        const channel = Channel.load(channelJson)
        guild.channels.set(channel.id, channel)
      })
      return guild
    } catch (e) {
      throw new Error('Failed to load guild: ' + e.message)
    }
  }
}
