import crypto from 'crypto'

class Encryption {
  private static readonly PREFIX = 'DAI.CHAT:'
  private static readonly ALGORITHM = 'aes-256-cbc'
  private readonly key: Buffer
  private readonly iv: Buffer

  constructor (secret: string) {
    this.key = crypto.createHash('sha256').update(secret).digest()
    this.iv = crypto.randomBytes(16)
  }

  encrypt (text: string): string {
    if (text.startsWith(Encryption.PREFIX)) {
      return text
    }

    const cipher = crypto.createCipheriv(Encryption.ALGORITHM, this.key, this.iv)
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ])

    return (
      Encryption.PREFIX +
      this.iv.toString('hex') +
      ':' +
      encrypted.toString('hex')
    )
  }

  decrypt (text: string): string {
    if (!text.startsWith(Encryption.PREFIX)) {
      return text
    }

    const encryptedText = text.slice(Encryption.PREFIX.length)
    const [ivHex, dataHex] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const encrypted = Buffer.from(dataHex, 'hex')

    const decipher = crypto.createDecipheriv(Encryption.ALGORITHM, this.key, iv)
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])

    return decrypted.toString('utf8')
  }
}

export default Encryption
