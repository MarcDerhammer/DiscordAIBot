import {
  type ChatCompletionRequestMessage,
  type OpenAIApi
} from 'openai'

export class OpenAiHelper {
  private readonly languageModel: string
  private readonly openai: OpenAIApi
  constructor (
    openai: OpenAIApi,
    languageModel: string
  ) {
    this.openai = openai
    this.languageModel = languageModel
  }

  async areMessagesInappropriate (messages: string[]): Promise<boolean> {
    const moderation = await this.openai.createModeration({ input: messages })
    return moderation.data.results.find(result => result.flagged) != null
  }

  async createChatCompletion (
    messages: ChatCompletionRequestMessage[], user?: string, maxTokens?: number):
    Promise<string> {
    const response = await this.openai.createChatCompletion({
      model: this.languageModel,
      messages,
      user
    })

    if (response.status !== 200) {
      throw new Error('OpenAI API returned status code ' + response.status.toString())
    }

    if (response.data.choices == null || response.data.choices.length === 0) {
      throw new Error('OpenAI API returned no response')
    }

    if (response.data.choices[0].finish_reason === 'content_filter') {
      throw new Error('OpenAI API returned content filter')
    }
    if (response.data.choices[0].finish_reason === 'stop' ||
        response.data.choices[0].finish_reason === 'length') {
      return response.data.choices[0].message?.content ?? ''
    }
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    throw new Error('OpenAI API returned unknown finish reason: ' +
        response.data.choices[0].finish_reason
    )
  }
}
