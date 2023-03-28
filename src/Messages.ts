import { ChatCompletionRequestMessageRoleEnum, type ChatCompletionRequestMessage } from 'openai'

export class Messages {
  systemMessages: ChatCompletionRequestMessage[]
  messages = new Map<string, ChatCompletionRequestMessage[]>()

  constructor (systemMessages: ChatCompletionRequestMessage[]) {
    this.systemMessages = systemMessages
  }

  addMessage (groupId: string, message: ChatCompletionRequestMessage): void {
    const messages = this.messages.get(groupId)
    if (messages == null) {
      this.messages.set(groupId, [...this.systemMessages])
      this.messages.get(groupId)?.push(message)
      console.log('Initializing conversation for group: ' + groupId)
      return
    }
    messages.push(message)
  }

  clearMessages (groupId: string): void {
    console.log('Clearing conversation for group: ' + groupId)
    this.messages.delete(groupId)
  }

  getMessages (groupId: string): ChatCompletionRequestMessage[] {
    const messages = this.messages.get(groupId)
    if (messages == null) {
      return []
    }
    return [...messages]
  }

  removeOldestNonSystemMessage (groupId: string): void {
    const messages = this.messages.get(groupId)
    if (messages == null) {
      return
    }

    const index = messages.findIndex(
      (message) => message.role !== ChatCompletionRequestMessageRoleEnum.System)

    messages.splice(index, 1)
  }
}
