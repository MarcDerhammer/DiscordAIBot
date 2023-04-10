import { randomUUID } from 'crypto'
import {
} from 'openai'
import { mongoClient } from '../mongo/MongoClient'
import { countTokens } from '../OpenAiHelper'

export class Message {
  id: string
  guildId: string
  channelId: string
  user: string
  content: string
  timestamp: number
  role: 'system' | 'user' | 'assistant'
  tokens: number
  constructor (
    {
      id,
      guildId,
      channelId,
      user,
      content,
      timestamp,
      role
    }: {
      id?: string
      guildId: string
      channelId: string
      user: string
      content: string
      timestamp: number
      role: 'system' | 'user' | 'assistant' }
  ) {
    this.id = id ?? randomUUID()
    this.guildId = guildId
    this.channelId = channelId
    this.user = user
    this.content = content
    this.timestamp = timestamp
    this.role = role
    this.tokens = countTokens([{
      role: this.role,
      content: this.content,
      name: this.user
    }])
  }

  async save (): Promise<void> {
    const messagesCollection = mongoClient.db('discord').collection('messages')
    await messagesCollection.insertOne(this)
  }

  async delete (): Promise<void> {
    const messagesCollection = mongoClient.db('discord').collection('messages')
    await messagesCollection.deleteOne({ id: this.id })
  }
}
