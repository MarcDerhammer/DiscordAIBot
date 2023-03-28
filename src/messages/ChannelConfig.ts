export interface ChannelConfig {
  ERROR_RESPONSE: string
  MODERATION_VIOLATION: string
  DEFAULT_SYSTEM_MESSAGE: string
  ONLY_RESPOND_TO_MENTIONS: boolean
  IGNORE_BOTS: boolean
  IGNORE_EVERYONE_MENTIONS: boolean
  DISCLAIMER: string
  MAX_TOKENS_PER_MESSAGE: number
}
