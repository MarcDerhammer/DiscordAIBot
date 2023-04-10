import crypto from 'crypto'

export const PREFIX = 'DAI.CHAT:'
class Encryption {
  private static readonly PREFIX = PREFIX
  private static readonly ALGORITHM = 'aes-256-cbc'
  private readonly key: Buffer

  constructor (secret: string) {
    this.key = crypto.createHash('sha256').update(secret).digest()
  }

  encrypt (text: string): string {
    if (text.startsWith(Encryption.PREFIX)) {
      return text
    }

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(Encryption.ALGORITHM, this.key, iv)
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ])

    return (
      Encryption.PREFIX +
      iv.toString('hex') +
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
