import * as functions from 'firebase-functions/v2';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export const extractUrlMetadata = functions.https.onRequest(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    cors: true
  },
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    try {
      const { url } = req.body;

        if (!url) {
          res.status(400).json({ success: false, error: 'URL is required' });
          return;
        }

        // Fetch the page content
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CoSTKnowledgeHub/1.0)'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract basic metadata from HTML
        const basicMetadata = {
          title: $('meta[property="og:title"]').attr('content') || 
                 $('title').text() || 
                 $('h1').first().text(),
          description: $('meta[property="og:description"]').attr('content') || 
                      $('meta[name="description"]').attr('content') || 
                      $('p').first().text().substring(0, 200),
          thumbnailUrl: $('meta[property="og:image"]').attr('content') || 
                       $('img').first().attr('src'),
          publishedDate: $('meta[property="article:published_time"]').attr('content') || 
                        $('time').first().attr('datetime') ||
                        $('meta[name="publish_date"]').attr('content')
        };

        // Clean up the extracted text
        const cleanText = (text: string) => text?.trim().replace(/\s+/g, ' ') || '';
        basicMetadata.title = cleanText(basicMetadata.title);
        basicMetadata.description = cleanText(basicMetadata.description);

        // If thumbnail is relative, make it absolute
        if (basicMetadata.thumbnailUrl && !basicMetadata.thumbnailUrl.startsWith('http')) {
          const urlObj = new URL(url);
          basicMetadata.thumbnailUrl = new URL(basicMetadata.thumbnailUrl, urlObj.origin).href;
        }

        // Use AI to enhance metadata extraction if available
        let enhancedMetadata: any = basicMetadata;
        
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (apiKey) {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

            // Extract main content text for AI analysis
            const mainContent = $('main').text() || $('article').text() || $('body').text();
            const contentSample = cleanText(mainContent).substring(0, 3000); // First 3000 chars

            const prompt = `
              Analyze this Independent Review Report content from the CoST website and provide metadata in JSON format.
              
              URL: ${url}
              Title found: ${basicMetadata.title}
              Description found: ${basicMetadata.description}
              Content sample: ${contentSample}
              
              Please provide:
              1. A professional title in English, Spanish, and Portuguese
              2. A 150-200 word summary in English, Spanish, and Portuguese
              3. The report period (e.g., "2023 Annual Review", "Q1 2024")
              4. Relevant CoST topic categories from: disclosure, assurance, procurement, monitoring, stakeholder, accountability
              5. 5-10 relevant tags
              
              Return a JSON object with this structure:
              {
                "title": { "en": "", "es": "", "pt": "" },
                "description": { "en": "", "es": "", "pt": "" },
                "reportPeriod": "",
                "suggestedTopics": [],
                "suggestedTags": []
              }
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const aiData = JSON.parse(jsonMatch[0]);
              
              enhancedMetadata = {
                title: aiData.title || basicMetadata.title,
                description: aiData.description || basicMetadata.description,
                thumbnailUrl: basicMetadata.thumbnailUrl,
                publishedDate: basicMetadata.publishedDate,
                reportPeriod: aiData.reportPeriod,
                suggestedTopics: aiData.suggestedTopics || ['assurance'],
                suggestedTags: aiData.suggestedTags || ['independent-review', 'cost-report']
              };
            }
          }
        } catch (aiError) {
          console.error('AI enhancement failed, using basic metadata:', aiError);
          // Continue with basic metadata
        }

        // Ensure we have at least some metadata
        const metadata = {
          title: enhancedMetadata.title || 'Independent Review Report',
          description: enhancedMetadata.description || 'CoST Independent Review Report',
          thumbnailUrl: enhancedMetadata.thumbnailUrl,
          publishedDate: enhancedMetadata.publishedDate,
          reportPeriod: enhancedMetadata.reportPeriod,
          suggestedTopics: enhancedMetadata.suggestedTopics || ['assurance'],
          suggestedTags: enhancedMetadata.suggestedTags || ['independent-review']
        };

        res.json({
          success: true,
          metadata
        });

    } catch (error: any) {
      console.error('URL metadata extraction error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to extract metadata from URL'
      });
    }
  }
);