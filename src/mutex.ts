export class Mutex {
  private readonly queue: Array<() => void> = []
  private locked = false

  async lock (): Promise<() => void> {
    return await new Promise((resolve) => {
      const unlock: () => void = () => {
        this.locked = false
        if (this.queue.length > 0) {
          const nextUnlock = this.queue.shift()
          if (nextUnlock != null) {
            nextUnlock()
          }
        }
      }

      if (this.locked) {
        this.queue.push(unlock)
      } else {
        this.locked = true
        resolve(unlock)
      }
    })
  }
}
