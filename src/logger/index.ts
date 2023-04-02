// when logging we should store in the database
// and print to the console
// logs should have fields like:
// - timestamp
// - message
// - guild
// - channel

import { LogEntry } from './LogEntry'

export const log = ({ message, guildId, channelId, level }:
{
  message: string
  guildId?: string
  channelId?: string
  level?: 'info' | 'warn' | 'error' }
): void => {
  // print to console
  console.log(`${guildId ?? '<missing guild>'}:${channelId ?? '<missing channel>'}: ${message}`)
  // store in database
  const logEntry = new LogEntry(message, guildId, channelId, level)
  void logEntry.save()
}
