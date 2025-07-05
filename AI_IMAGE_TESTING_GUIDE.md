# AI-Generated Cover Images Testing Guide

## Overview
The Knowledge Hub now uses AI-generated cover images for resource types using the Replicate SDXL model. This creates professional, Harvard Business Review-style abstract images that maintain brand consistency.

## Setup Required

### 1. Get Replicate API Token
1. Sign up at https://replicate.com
2. Go to https://replicate.com/account/api-tokens
3. Create a new token
4. Update `functions/.env`:
   ```
   REPLICATE_API_TOKEN=your_actual_token_here
   ```

### 2. Deploy the Updated Function
```bash
cd functions
npm run deploy:functions
```

## Testing the AI Generation

### 1. Via Admin UI
1. Go to Admin → Settings → Content Management
2. Click "Add Resource Type"
3. Fill in:
   - Label: "Test AI Type"
   - Description: "Testing AI image generation for abstract patterns"
4. Click "Generate with AI"
5. Wait ~7-10 seconds for the image to generate

### 2. Expected Results

#### Success Case:
- Professional abstract geometric image appears
- Uses navy blue, off-white, and teal color palette
- No people, text, or cluttered elements
- 2:1 aspect ratio (1024x512)
- Image URL starts with `https://replicate.delivery/`

#### Fallback Case (if no API token):
- Falls back to Lorem Picsum placeholder
- Consistent seed-based image
- URL format: `https://picsum.photos/seed/[number]/800/400`

## Cost Information

- **Per Image**: ~$0.0064 (approximately 7 seconds on L40S GPU)
- **Pricing**: $0.000975 per second
- **Caching**: Images are cached for 30 days in Firestore

## Concept Mappings

The AI uses intelligent concept mapping for different resource types:

| Resource Type | AI Concept |
|--------------|------------|
| Guidance | Geometric compass rose with pathways |
| Report | Abstract document with data flow lines |
| Dataset | Data visualization grid with nodes |
| Tool | Interlocking geometric gears |
| Policy | Structured framework grid |
| Template | Blueprint grid pattern |
| Infographic | Information flow diagram |

## Troubleshooting

### Image Not Generating
1. Check browser console for errors
2. Verify API token is set correctly
3. Check Cloud Function logs: `firebase functions:log`

### CORS Errors
- Already configured for localhost:4200 and production domains
- If testing from different port, update CORS in `generateCoverImage.ts`

### Slow Generation
- Normal generation time: 7-10 seconds
- First generation after deployment may be slower (cold start)

## Advanced Testing

### Test Different Concepts
Try these label/description combinations:

1. **Technical Pattern**:
   - Label: "Data Analysis Framework"
   - Description: "Advanced analytics and data processing methodology"

2. **Infrastructure Focus**:
   - Label: "Construction Standards"
   - Description: "Building and infrastructure quality benchmarks"

3. **Governance Theme**:
   - Label: "Transparency Guidelines"
   - Description: "Open governance and accountability framework"

## Environment Variables

```bash
# functions/.env
REPLICATE_API_TOKEN=your_replicate_token_here  # Required for AI generation
UNSPLASH_ACCESS_KEY=existing_key               # Fallback option
```

## Frontend Integration

The resource type modal already includes:
- "Generate with AI" button
- Loading spinner during generation
- Automatic form update when complete
- Error handling with fallback

No frontend changes needed - just add your Replicate API token!