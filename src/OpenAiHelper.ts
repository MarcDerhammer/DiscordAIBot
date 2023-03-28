import { encode } from 'gpt-3-encoder'
import { type ChatCompletionRequestMessage, type OpenAIApi } from 'openai'

export const countTokens = (messages: ChatCompletionRequestMessage[]): number => {
  return encode(JSON.stringify(messages)).length
}

export class OpenAiHelper {
  private readonly languageModel: string
  private readonly openai: OpenAIApi
  constructor (openai: OpenAIApi, languageModel: string) {
    this.openai = openai
    this.languageModel = languageModel
  }

  async areMessagesInappropriate (messages: string[]): Promise<boolean> {
    const moderation = await this.openai.createModeration({ input: messages })
    return moderation.data.results.find((result) => result.flagged) != null
  }

  async createChatCompletion (
    messages: ChatCompletionRequestMessage[],
    user?: string,
    totalMaxTokens?: number
  ): Promise<string> {
    const MAX_TOKEN_COUNT = getMaxTokens(this.languageModel as Model, totalMaxTokens) -
      countTokens(messages)

    if (MAX_TOKEN_COUNT <= 0) {
      throw new Error('Max tokens is less than or equal to 0')
    }

    console.log('Max tokens: ' + MAX_TOKEN_COUNT.toString())

    const response = await this.openai.createChatCompletion({
      model: this.languageModel,
      messages,
      user,
      max_tokens: MAX_TOKEN_COUNT
    })

    if (response.status !== 200) {
      throw new Error(
        'OpenAI API returned status code ' + response.status.toString()
      )
    }

    if (response.data.choices == null || response.data.choices.length === 0) {
      throw new Error('OpenAI API returned no response')
    }

    if (response.data.choices[0].finish_reason === 'content_filter') {
      throw new Error('OpenAI API returned content filter')
    }
    if (
      response.data.choices[0].finish_reason === 'stop' ||
      response.data.choices[0].finish_reason === 'length'
    ) {
      return response.data.choices[0].message?.content ?? ''
    }
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    throw new Error('OpenAI API returned unknown finish reason: ' +
        response.data.choices[0].finish_reason
    )
  }
}

export enum Model {
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  GPT_4 = 'gpt-4',
  GPT_4_32K = 'gpt-4-32k',
}

const modelMaxTokens: Record<Model, number> = {
  [Model.GPT_3_5_TURBO]: 4096,
  [Model.GPT_4]: 8192,
  [Model.GPT_4_32K]: 32768
}

export function getMaxTokens (model: Model, userMaxTokens?: number): number {
  const modelLimit = modelMaxTokens[model]

  if (userMaxTokens === undefined) {
    return modelLimit
  } else {
    return Math.min(modelLimit, userMaxTokens)
  }
}
