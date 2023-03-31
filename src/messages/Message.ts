import { randomUUID } from 'crypto'
import {
  type ChatCompletionRequestMessage
} from 'openai'
import { mongoClient } from '../mongo/MongoClient'
import { countTokens } from '../OpenAiHelper'

export class Message {
  id: string
  guildId: string
  channelId: string
  userId: string
  content: string
  timestamp: number
  type: 'system' | 'user' | 'assistant'
  tokens: number
  chatCompletionRequestMessage: ChatCompletionRequestMessage
  constructor (
    {
      id,
      guildId,
      channelId,
      userId, content,
      timestamp, type,
      chatCompletionRequestMessage
    }: {
      id?: string
      guildId: string
      channelId: string
      userId: string
      content: string
      timestamp: number
      type: 'system' | 'user' | 'assistant'
      chatCompletionRequestMessage: ChatCompletionRequestMessage }
  ) {
    this.id = id ?? randomUUID()
    this.guildId = guildId
    this.channelId = channelId
    this.userId = userId
    this.content = content
    this.timestamp = timestamp
    this.type = type
    this.chatCompletionRequestMessage = chatCompletionRequestMessage
    this.tokens = countTokens([chatCompletionRequestMessage])
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
