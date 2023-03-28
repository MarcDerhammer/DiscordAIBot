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

  removeAllSystemMessages (groupId: string): void {
  // filter out all system messages
    const messages = this.messages.get(groupId)
    if (messages == null) {
      return
    }

    // filter all system messages EXCEPT for the ones in the systemMessages array
    this.messages.set(groupId, messages.filter(
      (message) => message.role !== ChatCompletionRequestMessageRoleEnum.System ||
        this.systemMessages.find(x => x.content === message.content)))
  }

  removeAllUserMessages (groupId: string): void {
    // filter out all user messages
    const messages = this.messages.get(groupId)
    if (messages == null) {
      return
    }

    this.messages.set(groupId, messages.filter(
      (message) => message.role !== ChatCompletionRequestMessageRoleEnum.User))
  }

  removeAllBotMessages (groupId: string): void {
    // filter out all bot messages
    const messages = this.messages.get(groupId)
    if (messages == null) {
      return
    }

    this.messages.set(groupId, messages.filter(
      (message) => message.role !== ChatCompletionRequestMessageRoleEnum.Assistant))
  }
}
