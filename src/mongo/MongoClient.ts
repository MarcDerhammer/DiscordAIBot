import { MongoClient } from 'mongodb'

export const mongoClient = new MongoClient('mongodb://root:example@localhost:27017/discord_bot')
