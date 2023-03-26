import dotenv from 'dotenv'
dotenv.config()

const DEFAULT_ERROR_RESPONSE =
  'Sorry, there was an error. Please try again later.'
const DEFUALT_MODERATION_VIOLATION_RESPONSE =
  'Some content was detected violating Open AI\'s usage policies. ' +
  'Chat history has been cleared from future responses.'

type EnvConfig = Record<string, string | undefined>

interface RequiredEnv {
  API_KEY: string
  DISCORD_TOKEN: string
}

interface OptionalEnv {
  LANGUAGE_MODEL?: string
  ERROR_RESPONSE?: string
  MODERATION_VIOLATION?: string
  SYSTEM_MESSAGE?: string
  BOT_NAME?: string
  BOT_IMAGE_URL?: string
  ONLY_RESPOND_TO_MENTIONS?: 'true' | 'false'
  ONLY_RESPOND_IN_CHANNEL?: string
  IGNORE_BOTS?: 'true' | 'false'
  IGNORE_EVERYONE?: 'true' | 'false'
  DISCLAIMER?: string
}

type Env = RequiredEnv & OptionalEnv

const env: EnvConfig = {
  API_KEY: process.env.OPENAI_API_KEY,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  LANGUAGE_MODEL: process.env.LANGUAGE_MODEL ?? 'gpt-3.5-turbo',
  ERROR_RESPONSE: process.env.ERROR_RESPONSE ?? DEFAULT_ERROR_RESPONSE,
  MODERATION_VIOLATION:
    process.env.MODERATION_VIOLATION_RESPONSE ??
    DEFUALT_MODERATION_VIOLATION_RESPONSE,
  SYSTEM_MESSAGE: process.env.SYSTEM_MESSAGE,
  BOT_NAME: process.env.BOT_NAME,
  BOT_IMAGE_URL: process.env.BOT_IMAGE_URL,
  ONLY_RESPOND_TO_MENTIONS: process.env.ONLY_RESPOND_TO_MENTIONS ?? 'true',
  ONLY_RESPOND_IN_CHANNEL: process.env.ONLY_RESPOND_IN_CHANNEL,
  IGNORE_BOTS: process.env.IGNORE_BOTS ?? 'true',
  IGNORE_EVERYONE: process.env.IGNORE_EVERYONE ?? 'true',
  DISCLAIMER: process.env.DISCLAIMER
}

function isRequiredEnv (key: keyof Env): key is keyof RequiredEnv {
  return ['API_KEY', 'DISCORD_TOKEN'].includes(key)
}

export function getEnv (key: keyof Env): string {
  const value = env[key]
  if (isRequiredEnv(key) && value === undefined) {
    console.error(`Please set the ${key} environment variable.`)
    process.exit(1)
  }
  return value ?? ''
}
