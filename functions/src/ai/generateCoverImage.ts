import { onCall, HttpsError } from 'firebase-functions/v2/https';

/**
 * Simplified Cloud Function to generate cover images for resource types
 * Uses Lorem Picsum for now, with AI integration to be added later
 */
interface GenerateCoverImageData {
  title: string;
  description: string;
}

export const generateCoverImage = onCall<GenerateCoverImageData>({
  cors: [
    'http://localhost:4200',
    'http://localhost:5000',
    'https://knowledgehub-2ed2f.web.app',
    'https://knowledgehub-2ed2f.firebaseapp.com'
  ],
  maxInstances: 10,
}, async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to generate images'
    );
  }

  const { title, description } = request.data;

  if (!title || !description) {
    throw new HttpsError(
      'invalid-argument',
      'Title and description are required'
    );
  }

  try {
    // Generate a placeholder image using Lorem Picsum
    // In production, this will use AI to generate the image
    const keywords = [title, description].join(' ').toLowerCase();
    const seed = keywords.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Using Lorem Picsum with seed for consistent images
    const width = 800;
    const height = 400;
    const imageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;
    
    return {
      success: true,
      imageUrl,
      prompt: `Minimalist cover for: ${title}`
    };
    
  } catch (error) {
    console.error('Error generating cover image:', error);
    throw new HttpsError(
      'internal',
      'Failed to generate cover image'
    );
  }
});