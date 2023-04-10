import { mongoClient } from '../mongo/MongoClient'

export class LogEntry {
  timestamp: Date
  guildId?: string
  channelId?: string
  message: string
  level: 'info' | 'warn' | 'error' = 'info'
  userId?: string

  constructor (message: string, guildId?: string, channelId?: string,
    level?: 'info' | 'warn' | 'error', userId?: string) {
    this.timestamp = new Date()
    this.message = message
    this.guildId = guildId
    this.channelId = channelId
    this.level = level ?? 'info'
    this.userId = userId
  }

  async save (): Promise<void> {
    const logCollection = mongoClient.db('discord').collection('logs')
    await logCollection.insertOne(this)
  }
}
