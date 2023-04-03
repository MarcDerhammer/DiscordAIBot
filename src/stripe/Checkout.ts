import Stripe from 'stripe'
import { type Guild } from '../messages/Guild'
import { type Request, type Response } from 'express'
import { type Client, TextChannel } from 'discord.js'
import { log } from '../logger'

const GPT_3_PRICE_PER_TOKEN = 0.003 / 1000
const GPT_4_PRICE_PER_TOKEN = 0.05 / 1000

const GPT_3_UNIT_AMOUNT = 1000000
const GPT_4_UNIT_AMOUNT = 100000

const GPT_3_PRICE_PER_UNIT = Math.round(GPT_3_PRICE_PER_TOKEN * GPT_3_UNIT_AMOUNT * 100)
const GPT_4_PRICE_PER_UNIT = Math.round(GPT_4_PRICE_PER_TOKEN * GPT_4_UNIT_AMOUNT * 100)

const GPT_3_MESSAGE = 'Tokens are used to generate messages. ' +
'Using OpenAI\'s GPT-3.5-Turbo model, ' +
'one message using a full "memory" is 4,096 tokens.'

const GPT_4_MESSAGE = 'Tokens are used to generate messages.  Using OpenAI\'s GPT-4 model, ' +
'one message using a full "memory" is 8,192 tokens.'

if (
  process.env.STRIPE_SECRET_KEY?.length === 0 ||
  process.env.STRIPE_SECRET_KEY === undefined
) {
  throw new Error('Please set the STRIPE_SECRET_KEY environment variable.')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15'
})

export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

export enum TOKEN_TYPE {
  GPT_3 = 'GPT-3',
  GPT_4 = 'GPT-4'
}

export interface WebhookResponse {
  success: boolean
  anonymous?: boolean
  userId?: string
  channelId?: string
  type?: 'GPT-3' | 'GPT-4'
  tokens?: number
}

export async function handleWebHook (
  req: Request,
  res: Response,
  guilds: Map<string, Guild>,
  client: Client
): Promise<void> {
  try {
    if (WEBHOOK_SECRET === undefined || WEBHOOK_SECRET.length === 0) {
      throw new Error(
        'Please set the STRIPE_WEBHOOK_SECRET environment variable.'
      )
    }
    const sig = req.headers['stripe-signature'] as string

    const event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET)

    if (event.type === 'checkout.session.completed') {
      const simpleSession = event.data.object as Stripe.Checkout.Session

      // expand session to get more info
      const session = await stripe.checkout.sessions.retrieve(
        simpleSession.id,
        {
          expand: ['payment_intent', 'line_items']
        }
      )

      if (session.metadata === undefined) {
        throw new Error('Metadata not found')
      }

      const guildId = session.metadata?.discord_id as string
      const guild = guilds.get(guildId)
      if (guild === undefined) {
        log({
          level: 'error',
          message: 'Error in Stripe webhook: Guild not found: ' + guildId,
          guildId
        })
        throw new Error('Guild not found')
      }

      const userId = session.metadata?.purchaser_id as string

      // get amount
      let quantity = session.line_items?.data[0].quantity as number | undefined
      if (quantity === undefined) {
        quantity = 0
      }
      const type = (session.line_items?.data[0].description as string).includes(TOKEN_TYPE.GPT_3)
        ? TOKEN_TYPE.GPT_3
        : TOKEN_TYPE.GPT_4

      const channelId = session.metadata?.channel_id as string
      const channel = guild.channels.get(channelId)
      if (channel === undefined) {
        throw new Error('Channel not found')
      }

      // Extract the custom_fields for "anonymous" key
      let anonymousValue = true
      for (const field of session.custom_fields) {
        if (field.key === 'anonymous') {
          anonymousValue = field.dropdown?.value === 'true'
          break
        }
      }

      const scale = type === TOKEN_TYPE.GPT_3 ? GPT_3_UNIT_AMOUNT : GPT_4_UNIT_AMOUNT
      const totalToAdd = quantity * scale

      const info = {
        anonymous: anonymousValue,
        userId,
        channelId,
        type,
        tokens: totalToAdd,
        previousBalanceGPT3: guild.gpt3TokensAvailable,
        previousBalanceGPT4: guild.gpt4TokensAvailable
      }

      log({
        message: JSON.stringify(info),
        guildId,
        channelId
      })

      if (type === TOKEN_TYPE.GPT_3) {
        guild.gpt3TokensAvailable += totalToAdd
      } else {
        guild.gpt4TokensAvailable += totalToAdd
      }
      await guild.save()

      const postInfo = {
        anonymous: anonymousValue,
        userId,
        channelId,
        type,
        tokens: totalToAdd,
        newBalanceGPT3: guild.gpt3TokensAvailable,
        newBalanceGPT4: guild.gpt4TokensAvailable
      }

      log({
        message: JSON.stringify(postInfo)
      })

      res.send('Success')
      const discordChannel = await client.channels.fetch(channelId)

      if (discordChannel instanceof TextChannel) {
        if ((anonymousValue ?? false) || userId == null || userId.length === 0) {
          await discordChannel.send('An anonymous user purchased ' +
            `${totalToAdd.toLocaleString()} tokens for ${type ?? ''}`)
        } else {
          await discordChannel.send(`<@${userId}> purchased ` +
          `${totalToAdd.toLocaleString()} tokens for ${type ?? ''}!`)
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    res.status(500).send(`Webhook Error: ${err.message}`)
    log({
      level: 'error',
      message: 'Error in Stripe webhook: ' + (err.message as string)
    })
  }
}

export default async function generateCheckout (
  serverId: string,
  serverName: string,
  purchaserId: string,
  channelId: string,
  type: TOKEN_TYPE
): Promise<string> {
  const SHORT_FORMAT_NUMBER = type === TOKEN_TYPE.GPT_3
    ? Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(GPT_3_UNIT_AMOUNT)
    : Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(GPT_4_UNIT_AMOUNT)

  const LONG_FORMAT_NUMBER = type === TOKEN_TYPE.GPT_3
    ? Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'long'
    }).format(GPT_3_UNIT_AMOUNT)

    : Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'long'
    }).format(GPT_4_UNIT_AMOUNT)

  const session = await stripe.checkout.sessions.create({
    custom_text: {
      submit: {
        message: (type === TOKEN_TYPE.GPT_3 ? GPT_3_MESSAGE : GPT_4_MESSAGE) +
          'Please note that this balance will be added to ' +
          "the entire server's balance." +
          'Your email is not shared with the server but if you selected "No" for anonymous, ' +
          'your Discord username will be mentioned in the server.'
      }
    },
    payment_method_types: ['card', 'cashapp'],
    success_url: 'https://discordai.chat/payment',
    cancel_url: 'https://discordai.chat',
    automatic_tax: {
      enabled: true
    },
    line_items: [
      {
        quantity: 1,
        adjustable_quantity: {
          enabled: true,
          minimum: 1,
          maximum: 50
        },
        price_data: {
          tax_behavior: 'exclusive',
          currency: 'usd',
          product_data: {
            name: `${SHORT_FORMAT_NUMBER} ${type} Tokens`,
            description: `${LONG_FORMAT_NUMBER} ${type} Tokens for Discord Server: ${serverName}`
          },
          unit_amount: type === TOKEN_TYPE.GPT_3 ? GPT_3_PRICE_PER_UNIT : GPT_4_PRICE_PER_UNIT
        }
      }
    ],
    submit_type: 'auto',
    mode: 'payment',
    custom_fields: [
      {
        key: 'anonymous',
        type: 'dropdown',
        optional: false,
        label: {
          custom: 'Purchase anonymously (mention you in server)',
          type: 'custom'
        },
        dropdown: {
          options: [
            {
              label: 'No',
              value: 'false'
            },
            {
              label: 'Yes',
              value: 'true'
            }
          ]
        }
      }
    ],
    metadata: {
      discord_id: serverId,
      purchaser_id: purchaserId,
      server_name: serverName,
      channel_id: channelId
    }
  })
  if (session.url === null) {
    throw new Error('Session URL is undefined')
  }
  return session.url
}
