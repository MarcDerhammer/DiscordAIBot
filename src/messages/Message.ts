import { randomUUID } from 'crypto'
import {
} from 'openai'
import { mongoClient } from '../mongo/MongoClient'
import { countTokens } from '../OpenAiHelper'
import { enc } from '../index'

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

    // instead of saving the object as is, replace the content field as its encrypted version
    const encryptedMessage = {
      ...this,
      content: enc.encrypt(this.content)
    }
    await messagesCollection.insertOne(encryptedMessage)
  }

  async delete (): Promise<void> {
    const messagesCollection = mongoClient.db('discord').collection('messages')
    await messagesCollection.deleteOne({ id: this.id })
  }
}
