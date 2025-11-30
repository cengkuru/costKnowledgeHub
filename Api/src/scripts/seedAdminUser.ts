import bcrypt from 'bcryptjs';
import { connectToDatabase, closeDatabase } from '../db';
import { User, USERS_COLLECTION_NAME } from '../models/User';

/**
 * Seed script to create the initial admin user
 * Run with: npx ts-node src/scripts/seedAdminUser.ts
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@infrastructuretransparency.org';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CoST-Admin-2024!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'CoST Admin';

async function seedAdminUser() {
  console.log('🔐 Seeding admin user...\n');

  try {
    const db = await connectToDatabase();
    const collection = db.collection<User>(USERS_COLLECTION_NAME);

    // Check if admin already exists
    const existingAdmin = await collection.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      console.log(`⚠️  Admin user already exists: ${ADMIN_EMAIL}`);
      console.log('   To reset, delete the user from MongoDB and run this script again.\n');
      await closeDatabase();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin user
    const adminUser: User = {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: 'admin', // CRITICAL: Set role to admin
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(adminUser);

    console.log('✅ Admin user created successfully!\n');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Name:     ${ADMIN_NAME}`);
    console.log(`   Role:     admin`);
    console.log(`   ID:       ${result.insertedId}`);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('   ⚠️  IMPORTANT: Change this password after first login!\n');

    await closeDatabase();
  } catch (error) {
    console.error('❌ Failed to seed admin user:', error);
    await closeDatabase();
    process.exit(1);
  }
}

seedAdminUser();
