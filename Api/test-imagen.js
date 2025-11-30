require('dotenv').config({ path: '/Users/cengkurumichael/Dev/cost-knowledge-hub/Api/.env', override: true });
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key configured:', apiKey ? 'YES (starts with: ' + apiKey.substring(0, 15) + '...)' : 'NO');
console.log('API Key length:', apiKey?.length);

if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY is not set');
  process.exit(1);
}

async function testImageGen() {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Create a Harvard Business Review style conceptual illustration for "Infrastructure Transparency".
Style: Abstract, conceptual, thought-provoking. Bold geometric shapes, sophisticated visual metaphors. NO people, NO humanoid figures, NO characters. Pure conceptual illustration.
Technique: Flat design with subtle gradients, layered geometric shapes, architectural forms.
Color palette: Deep teal (#2A6478), rich coral (#D94F4F), warm amber (#E8A838), cream white (#F8F6F1).
Composition: Asymmetric balance, negative space as a design element, bold shapes intersecting meaningfully.
Absolutely NO: text, logos, watermarks, people, faces, hands, humanoid figures.
Aspect ratio: 4:3 landscape.`;

  console.log('Testing Gemini 3 Pro Image Preview generation...');
  console.log('Prompt:', prompt.substring(0, 100) + '...');

  try {
    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: prompt,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      }
    });

    const duration = Date.now() - startTime;
    console.log('Response received in', duration, 'ms');

    // Extract image from response parts
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content?.parts || [];
      console.log('Parts count:', parts.length);

      for (const part of parts) {
        if (part.text) {
          console.log('Text response:', part.text.substring(0, 200));
        }
        if (part.inlineData && part.inlineData.data) {
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          console.log('SUCCESS! Image size:', buffer.length, 'bytes');
          console.log('MIME type:', part.inlineData.mimeType);
          require('fs').writeFileSync('/tmp/test-gemini-result.png', buffer);
          console.log('Image saved to /tmp/test-gemini-result.png');
          return;
        }
      }
      console.log('No image data found in parts');
    } else {
      console.log('No candidates in response');
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('Full error:', error);
  }
}

testImageGen();
