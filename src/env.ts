import dotenv from 'dotenv'
dotenv.config()

export const DEFAULT_ERROR_RESPONSE =
  'Sorry, there was an error. Please try again later.'
export const DEFAULT_MODERATION_VIOATION_RESPONSE =
  'Some content in this chat\'s history was detected violating Open AI\'s usage policies. ' +
  'The offending messages have been cleared from my memory.'
export const DISCLAIMER = 'This bot uses Open AI\'s GPT API to generate messages.  ' +
  'Any person or character it may be imitating is a simulation.'

type EnvConfig = Record<string, string | undefined>

interface RequiredEnv {
  API_KEY: string
  DISCORD_TOKEN: string
}

interface OptionalEnv {
  GPT3_TOKENS_AVAILABLE_PER_SERVER?: string
  GPT4_TOKENS_AVAILABLE_PER_SERVER?: string
}

type Env = RequiredEnv & OptionalEnv

const env: EnvConfig = {
  API_KEY: process.env.OPENAI_API_KEY,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN
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
