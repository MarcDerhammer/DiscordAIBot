import { MongoClient } from 'mongodb'

// Connection URI
const user = encodeURIComponent(process.env.MONGO_USER ?? '')
const password = encodeURIComponent(process.env.MONGO_PASSWORD ?? '')
const host = process.env.MONGO_HOST ?? ''
const port = process.env.MONGO_PORT ?? '27017'
const dbName = process.env.MONGO_DB ?? ''

const uri = `mongodb://${user}:${password}@${host}:${port}/${dbName}?authSource=admin`

export const mongoClient = new MongoClient(uri)
