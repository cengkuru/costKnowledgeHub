import { connectToDatabase, closeDatabase } from '../db';

/**
 * Update category names in existing resources
 * - "Assurance" → "Independent Review"
 * - "Infrastructure Index" → "Infrastructure Transparency Index"
 */

async function updateCategories() {
  console.log('🔄 Updating category names in resources...\n');

  try {
    const db = await connectToDatabase();
    const collection = db.collection('resources');

    // Update Assurance → Independent Review
    const assuranceResult = await collection.updateMany(
      {
        $or: [
          { category: 'Assurance' },
          { 'tags': 'Assurance' }
        ]
      },
      [
        {
          $set: {
            category: {
              $cond: {
                if: { $eq: ['$category', 'Assurance'] },
                then: 'Independent Review',
                else: '$category'
              }
            },
            tags: {
              $map: {
                input: { $ifNull: ['$tags', []] },
                as: 'tag',
                in: {
                  $cond: {
                    if: { $eq: ['$$tag', 'Assurance'] },
                    then: 'Independent Review',
                    else: '$$tag'
                  }
                }
              }
            }
          }
        }
      ]
    );
    console.log(`✅ Updated ${assuranceResult.modifiedCount} resources: Assurance → Independent Review`);

    // Update Infrastructure Index → Infrastructure Transparency Index
    const indexResult = await collection.updateMany(
      {
        $or: [
          { category: 'Infrastructure Index' },
          { 'tags': 'Infrastructure Index' }
        ]
      },
      [
        {
          $set: {
            category: {
              $cond: {
                if: { $eq: ['$category', 'Infrastructure Index'] },
                then: 'Infrastructure Transparency Index',
                else: '$category'
              }
            },
            tags: {
              $map: {
                input: { $ifNull: ['$tags', []] },
                as: 'tag',
                in: {
                  $cond: {
                    if: { $eq: ['$$tag', 'Infrastructure Index'] },
                    then: 'Infrastructure Transparency Index',
                    else: '$$tag'
                  }
                }
              }
            }
          }
        }
      ]
    );
    console.log(`✅ Updated ${indexResult.modifiedCount} resources: Infrastructure Index → Infrastructure Transparency Index`);

    // Verify the updates
    const categories = await collection.distinct('category');
    console.log('\n📊 Current categories in database:');
    categories.forEach(cat => console.log(`   - ${cat}`));

    await closeDatabase();
    console.log('\n✅ Category update complete!');
  } catch (error) {
    console.error('❌ Failed to update categories:', error);
    await closeDatabase();
    process.exit(1);
  }
}

updateCategories();
