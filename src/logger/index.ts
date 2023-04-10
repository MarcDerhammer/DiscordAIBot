// when logging we should store in the database
// and print to the console
// logs should have fields like:
// - timestamp
// - message
// - guild
// - channel

import { LogEntry } from './LogEntry'
import { enc } from '../index'

export const log = ({ message, guildId, channelId, level, userId }:
{
  message: string
  guildId?: string
  channelId?: string
  level?: 'info' | 'warn' | 'error'
  userId?: string
}
): void => {
  // print to console
  const encrypted = enc.encrypt(
    `${guildId ?? '<missing guild>'}:${channelId ?? '<missing channel>'}: ${message}`
  )
  console.log(encrypted)
  // store in database
  const logEntry = new LogEntry(enc.encrypt(message), guildId, channelId, level, userId)
  void logEntry.save()
}
