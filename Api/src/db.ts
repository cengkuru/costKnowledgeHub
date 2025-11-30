import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'infrascope';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
    if (db) {
        return db;
    }

    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }

    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        db = client.db(DB_NAME);
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

export async function getDatabase(): Promise<Db> {
    if (!db) {
        return await connectToDatabase();
    }
    return db;
}

export async function closeDatabase(): Promise<void> {
    if (client) {
        await client.close();
        console.log('MongoDB connection closed');
        // Reset references to allow reconnection
        db = null as any;
        client = null as any;
    }
}
