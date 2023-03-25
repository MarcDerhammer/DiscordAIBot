import dotenv from 'dotenv'
dotenv.config()

type EnvConfig = Record<string, string | undefined>

const env: EnvConfig = {
  API_KEY: process.env.OPENAI_API_KEY,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  LANGUAGE_MODEL: process.env.LANGUAGE_MODEL,
  ERROR_RESPONSE: process.env.ERROR_RESPONSE,
  MODERATION_VIOLATION: process.env.MODERATION_VIOLATION_RESPONSE,
  SYSTEM_MESSAGE: process.env.SYSTEM_MESSAGE
}

export function getEnv (key: string): string {
  const value = env[key]
  if (value === undefined) {
    console.error(`Please set the ${key} environment variable.`)
    process.exit(1)
  }
  return value
}