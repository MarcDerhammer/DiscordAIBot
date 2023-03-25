import dotenv from 'dotenv'
dotenv.config()

type EnvConfig = Record<string, string | undefined>

interface RequiredEnv {
  API_KEY: string
  DISCORD_TOKEN: string
  LANGUAGE_MODEL: string
  ERROR_RESPONSE: string
  MODERATION_VIOLATION: string
  SYSTEM_MESSAGE: string
}

interface OptionalEnv {
  BOT_NAME?: string
  BOT_IMAGE_URL?: string
  ONLY_RESPOND_TO_MENTIONS?: string
  ONLY_RESPOND_IN_CHANNEL?: string
}

type Env = RequiredEnv & OptionalEnv

const env: EnvConfig = {
  API_KEY: process.env.OPENAI_API_KEY,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  LANGUAGE_MODEL: process.env.LANGUAGE_MODEL,
  ERROR_RESPONSE: process.env.ERROR_RESPONSE,
  MODERATION_VIOLATION: process.env.MODERATION_VIOLATION_RESPONSE,
  SYSTEM_MESSAGE: process.env.SYSTEM_MESSAGE,
  BOT_NAME: process.env.BOT_NAME,
  BOT_IMAGE_URL: process.env.BOT_IMAGE_URL,
  ONLY_RESPOND_TO_MENTIONS: process.env.ONLY_RESPOND_TO_MENTIONS,
  ONLY_RESPOND_IN_CHANNEL: process.env.ONLY_RESPOND_IN_CHANNEL
  BOT_IMAGE_URL: process.env.BOT_IMAGE_URL
}

function isRequiredEnv (key: keyof Env): key is keyof RequiredEnv {
  return [
    'API_KEY',
    'DISCORD_TOKEN',
    'LANGUAGE_MODEL',
    'ERROR_RESPONSE',
    'MODERATION_VIOLATION',
    'SYSTEM_MESSAGE'
  ].includes(key)
}

export function getEnv (key: keyof Env): string {
  const value = env[key]
  if (isRequiredEnv(key) && value === undefined) {
    console.error(`Please set the ${key} environment variable.`)
    process.exit(1)
  }
  return value ?? ''
}
