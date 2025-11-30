import { Storage } from '@google-cloud/storage';
import { config } from '../config';

let storage: Storage | null = null;

function getStorage(): Storage {
  if (!storage) {
    storage = new Storage({
      projectId: config.gcpProjectId || undefined,
    });
  }
  return storage;
}

export const imageStorageService = {
  /**
   * Upload an image to GCS and return the public URL
   */
  async uploadTopicImage(topicId: string, imageBuffer: Buffer): Promise<string> {
    const bucketName = config.gcsBucketName;
    const filename = `topics/${topicId}/${Date.now()}.png`;

    console.log('GCS Upload:', { bucketName, filename, bufferSize: imageBuffer.length });

    try {
      const bucket = getStorage().bucket(bucketName);
      const file = bucket.file(filename);

      await file.save(imageBuffer, {
        contentType: 'image/png',
        metadata: {
          cacheControl: 'public, max-age=31536000', // 1 year cache
        },
      });

      // File is automatically public since bucket has uniform bucket-level access with allUsers:objectViewer
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
      console.log('GCS Upload Success:', { publicUrl });

      return publicUrl;
    } catch (error) {
      console.error('GCS Upload Error:', error);
      throw error;
    }
  },

  /**
   * Delete an image from GCS
   */
  async deleteTopicImage(imageUrl: string): Promise<void> {
    // Only process GCS URLs
    if (!imageUrl.includes('storage.googleapis.com')) {
      console.log('Not a GCS URL, skipping delete:', imageUrl.substring(0, 50));
      return;
    }

    const bucketName = config.gcsBucketName;

    // Extract filename from URL: https://storage.googleapis.com/bucket/path/to/file.png
    const match = imageUrl.match(/storage\.googleapis\.com\/[^/]+\/(.+)/);
    if (!match) {
      console.warn('Could not parse GCS URL:', imageUrl);
      return;
    }

    const filename = match[1];
    console.log('GCS Delete:', { bucketName, filename });

    try {
      const bucket = getStorage().bucket(bucketName);
      const file = bucket.file(filename);

      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        console.log('GCS Delete Success:', { filename });
      } else {
        console.log('GCS file does not exist, skipping:', filename);
      }
    } catch (error) {
      console.error('GCS Delete Error:', error);
      // Don't throw - deletion failure shouldn't block regeneration
    }
  },

  /**
   * Check if GCS is properly configured
   */
  isConfigured(): boolean {
    return !!config.gcsBucketName;
  },

  /**
   * Upload a resource cover image to GCS and return the public URL
   * @param resourceId - The resource ID
   * @param imageBuffer - The image buffer to upload
   * @param imageType - Type of image: 'upload' for user uploads, 'ai' for AI-generated
   */
  async uploadResourceCover(
    resourceId: string,
    imageBuffer: Buffer,
    imageType: 'upload' | 'ai' = 'upload'
  ): Promise<string> {
    const bucketName = config.gcsBucketName;
    const filename = `resources/${resourceId}/${imageType}-${Date.now()}.png`;

    console.log('GCS Resource Cover Upload:', { bucketName, filename, bufferSize: imageBuffer.length });

    try {
      const bucket = getStorage().bucket(bucketName);
      const file = bucket.file(filename);

      await file.save(imageBuffer, {
        contentType: 'image/png',
        metadata: {
          cacheControl: 'public, max-age=31536000', // 1 year cache
        },
      });

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
      console.log('GCS Resource Cover Upload Success:', { publicUrl });

      return publicUrl;
    } catch (error) {
      console.error('GCS Resource Cover Upload Error:', error);
      throw error;
    }
  },

  /**
   * Delete a resource cover image from GCS
   */
  async deleteResourceCover(imageUrl: string): Promise<void> {
    // Only process GCS URLs
    if (!imageUrl.includes('storage.googleapis.com')) {
      console.log('Not a GCS URL, skipping delete:', imageUrl.substring(0, 50));
      return;
    }

    const bucketName = config.gcsBucketName;

    // Extract filename from URL: https://storage.googleapis.com/bucket/path/to/file.png
    const match = imageUrl.match(/storage\.googleapis\.com\/[^/]+\/(.+)/);
    if (!match) {
      console.warn('Could not parse GCS URL:', imageUrl);
      return;
    }

    const filename = match[1];
    console.log('GCS Resource Cover Delete:', { bucketName, filename });

    try {
      const bucket = getStorage().bucket(bucketName);
      const file = bucket.file(filename);

      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        console.log('GCS Resource Cover Delete Success:', { filename });
      } else {
        console.log('GCS file does not exist, skipping:', filename);
      }
    } catch (error) {
      console.error('GCS Resource Cover Delete Error:', error);
      // Don't throw - deletion failure shouldn't block operations
    }
  },
};

export default imageStorageService;
