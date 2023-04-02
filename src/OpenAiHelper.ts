import { encode } from 'gpt-3-encoder'
import { type ChatCompletionRequestMessage, type OpenAIApi } from 'openai'

export const countTokens = (messages: ChatCompletionRequestMessage[]): number => {
  return encode(JSON.stringify(messages)).length
}

export class OpenAiHelper {
  private readonly openai: OpenAIApi
  constructor (openai: OpenAIApi) {
    this.openai = openai
  }

  /**
   * Searches the messages for moderation violations
   * @param messages the messages to check for moderation violations
   * @returns the indices of the messages that are inappropriate
   */
  async findModerationIndices (messages: string[]): Promise<number[]> {
    const moderation = await this.openai.createModeration({ input: messages })
    if (moderation.status !== 200) {
      throw new Error(
        'OpenAI API returned status code ' + moderation.status.toString()
      )
    }

    // find the indices of the messages that are inappropriate
    const flaggedIndices = moderation.data.results
      .map((result, index) => {
        if (result.flagged) {
          return index
        }
        return -1
      })
      .filter(index => index !== -1)
    return flaggedIndices
  }

  async createChatCompletion (
    messages: ChatCompletionRequestMessage[],
    languageModel: string,
    user?: string
  ): Promise<string> {
    const MAX_TOKEN_COUNT = getMaxTokens(languageModel as Model) -
      countTokens(messages)

    if (MAX_TOKEN_COUNT <= 0) {
      throw new Error('Max tokens is less than or equal to 0')
    }

    const response = await this.openai.createChatCompletion({
      model: languageModel,
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
