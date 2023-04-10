import dotenv from 'dotenv'
import { log } from './logger'
dotenv.config()

export const DEFAULT_ERROR_RESPONSE =
  'Sorry, there was an error. Please try again later.'
export const DEFAULT_MODERATION_VIOATION_RESPONSE =
  'Some content in this chat\'s history was detected violating Open AI\'s usage policies. ' +
  'The offending messages have been cleared from my memory.'
export const DISCLAIMER = 'This bot uses Open AI\'s GPT API to generate messages.  ' +
  'Any person or character it may be imitating is a simulation. ' +
  'Use `/system` to add system messages to the conversation.'

type EnvConfig = Record<string, string | undefined>

interface RequiredEnv {
  API_KEY: string
  DISCORD_TOKEN: string
  ENCRYPTION_KEY: string
}

interface OptionalEnv {
  GPT3_TOKENS_AVAILABLE_PER_SERVER?: string
  GPT4_TOKENS_AVAILABLE_PER_SERVER?: string
  STRIPE_SECRET_KEY?: string
  ADMIN_API_KEY?: string
  NTFY_TOPIC?: string
}

type Env = RequiredEnv & OptionalEnv

const env: EnvConfig = {
  API_KEY: process.env.OPENAI_API_KEY,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  ADMIN_API_KEY: process.env.ADMIN_API_KEY,
  NTFY_TOPIC: process.env.NTFY_TOPIC,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
}

function isRequiredEnv (key: keyof Env): key is keyof RequiredEnv {
  return ['API_KEY', 'DISCORD_TOKEN'].includes(key)
}

export function getEnv (key: keyof Env): string {
  const value = env[key]
  if (isRequiredEnv(key) && value === undefined) {
    log({
      level: 'error',
      message: `Please set the ${key} environment variable.`
    })
    process.exit(1)
  }
  return value ?? ''
}
