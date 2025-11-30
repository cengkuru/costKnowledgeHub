import { ObjectId } from 'mongodb';
import { connectToDatabase, getDatabase, closeDatabase } from '../db';
import { TOPICS_COLLECTION_NAME } from '../models/Topic';
import { COLLECTION_NAME as RESOURCE_COLLECTION } from '../models/Resource';
import { mapResourceToTopic } from '../utils/topicCategory';
import topicService from '../services/topicService';

async function ensureIndependentReviewsTopic(dbTopics: any[]): Promise<Set<string>> {
  const topicsCollection = (await getDatabase()).collection(TOPICS_COLLECTION_NAME);
  const topicNames = new Set(dbTopics.map(t => t.name));

  // Rename legacy "Independent Review" to "Independent Reviews" if needed
  if (!topicNames.has('Independent Reviews')) {
    const legacy = dbTopics.find(t => t.name === 'Independent Review');
    if (legacy) {
      await topicsCollection.updateOne(
        { _id: new ObjectId(legacy._id) },
        {
          $set: {
            name: 'Independent Reviews',
            slug: 'independent-reviews',
            updatedAt: new Date(),
          },
        }
      );
      topicNames.delete('Independent Review');
      topicNames.add('Independent Reviews');
      console.log('Renamed topic "Independent Review" to "Independent Reviews"');
    }
  }

  return topicNames;
}

async function mapResources(): Promise<void> {
  await connectToDatabase();
  const db = await getDatabase();
  const topicsCollection = db.collection(TOPICS_COLLECTION_NAME);
  const resourcesCollection = db.collection(RESOURCE_COLLECTION);

  const topics = await topicsCollection.find({}).toArray();
  const activeTopicNames = await ensureIndependentReviewsTopic(topics);

  const cursor = resourcesCollection.find({});
  let updated = 0;
  let unchanged = 0;

  while (await cursor.hasNext()) {
    const resource = await cursor.next();
    const category = mapResourceToTopic(resource, { activeTopics: activeTopicNames });

    const existingTopics: string[] = Array.isArray(resource.topics)
      ? resource.topics.filter(Boolean)
      : [];
    const topicsSet = new Set([category, ...existingTopics]);
    const topicsArray = Array.from(topicsSet);

    const needsCategoryUpdate = resource.category !== category;
    const needsTopicsUpdate = JSON.stringify(existingTopics) !== JSON.stringify(topicsArray);

    if (needsCategoryUpdate || needsTopicsUpdate) {
      await resourcesCollection.updateOne(
        { _id: resource._id },
        {
          $set: {
            category,
            topics: topicsArray,
            updatedAt: new Date(),
          },
        }
      );
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`Resources updated: ${updated}`);
  console.log(`Resources unchanged: ${unchanged}`);

  await topicService.updateResourceCounts();
  console.log('Topic resource counts refreshed');
}

mapResources()
  .then(() => {
    console.log('✅ Resource-to-topic mapping completed');
  })
  .catch((error) => {
    console.error('❌ Failed to map resources to topics:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
