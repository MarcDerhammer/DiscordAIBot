import Stripe from 'stripe'
import { type Guild } from '../messages/Guild'
import { type Request, type Response } from 'express'

if (process.env.STRIPE_SECRET_KEY?.length === 0 || process.env.STRIPE_SECRET_KEY === undefined) {
  throw new Error('Please set the STRIPE_SECRET_KEY environment variable.')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15'
})

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

export interface WebhookResponse {
  success: boolean
  anonymous?: boolean
  userId?: string
  channelId?: string
}

export async function handleWebHook (
  req: Request, guilds: Map<string, Guild>):
  Promise<WebhookResponse> {
  try {
    if (WEBHOOK_SECRET === undefined || WEBHOOK_SECRET.length === 0) {
      throw new Error('Please set the STRIPE_WEBHOOK_SECRET environment variable.')
    }
    const sig = req.headers['stripe-signature'] as string

    const event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.metadata === undefined) {
        throw new Error('Metadata not found')
      }

      const guildId = session.metadata?.discord_id as string
      const guild = guilds.get(guildId)
      if (guild === undefined) {
        console.error('Guild not found: ' + guildId)
        throw new Error('Guild not found')
      }

      const userId = session.metadata?.purchaser_id as string

      // get amount
      const quantity = session.line_items?.data[0].quantity as number
      const type = session.line_items?.data[0].description as string

      const channelId = session.metadata?.channel_id as string
      const channel = guild.channels.get(channelId)
      if (channel === undefined) {
        throw new Error('Channel not found')
      }

      const totalToAdd = quantity * 1000000

      guild.gpt3TokensAvailable += totalToAdd
      await guild.save()

      // Extract the custom_fields for "anonymous" key
      let anonymousValue = true
      for (const field of session.custom_fields) {
        if (field.key === 'anonymous') {
          anonymousValue = field.dropdown?.value === 'true'
          break
        }
      }

      return {
        success: true,
        anonymous: anonymousValue,
        userId,
        channelId
      }
    }
  } catch (err) {
    console.error(err)
  }
  return {
    success: false
  }
}

export default async function generateCheckout (
  serverId: string,
  serverName: string,
  purchaserId: string,
  channelId: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    custom_text: {
      submit: {
        message: 'Tokens are used to generate messages.  Using OpenAI\'s GPT-3.5-Turbo model, ' +
        'one message using a full "memory" is 4,096 tokens.  So 1 Million tokens will ' +
        'generate around 250 messages. \n' +
         'Please note that this balance will be added to ' +
        'the entire server\'s balance.'
      }
    },
    payment_method_types: [
      'card',
      'cashapp'
    ],
    success_url: 'https://google.com/',
    cancel_url: 'https://bing.com',
    line_items: [
      {
        quantity: 1,
        adjustable_quantity: {
          enabled: true,
          minimum: 1,
          maximum: 100
        },
        price_data: {
          currency: 'usd',
          product_data: {
            name: '1 Million GPT-3 Tokens',
            description: 'GPT-3 Tokens for Discord Server: "' + serverName + '"'
          },
          unit_amount: 300
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
          custom: 'Purchase anonymously',
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
