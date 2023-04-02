export class Ntfy {
  topic: string

  constructor (topic: string) {
    this.topic = topic
  }

  async publish (message: string, title: string, tags?: string): Promise<void> {
    if (this.topic === '') return
    await fetch('https://ntfy.sh/' + this.topic, {
      method: 'POST',
      body: message,
      headers: {
        Title: title,
        Priority: 'high',
        Tags: tags ?? ''
      }
    })
  }
}
