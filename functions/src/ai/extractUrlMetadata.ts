import * as functions from 'firebase-functions/v2';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as https from 'https';
import * as http from 'http';
import * as zlib from 'zlib';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export const extractUrlMetadata = functions.https.onRequest(
  {
    timeoutSeconds: 60,
    memory: '1GiB',
    cors: [
      'http://localhost:4200',
      'http://localhost:5000',
      'https://knowledgehub-2ed2f.web.app',
      'https://knowledgehub-2ed2f.firebaseapp.com'
    ]
  },
  async (req, res) => {
    // Handle CORS preflight for OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

        // Fetch the page content with proper compression handling
        const html = await new Promise<string>((resolve, reject) => {
          const urlObj = new URL(url);
          const protocol = urlObj.protocol === 'https:' ? https : http;
          
          const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate'
            }
          };

          const req = protocol.request(options, (res) => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Failed to fetch URL: ${res.statusCode} ${res.statusMessage}`));
              return;
            }

            // Handle redirects
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              const redirectUrl = new URL(res.headers.location, url);
              // Recursively fetch the redirect URL (simplified - in production you'd want to limit redirects)
              reject(new Error(`Redirect to ${redirectUrl.href} - please use the final URL`));
              return;
            }

            let stream: any = res;
            
            // Handle compression
            const encoding = res.headers['content-encoding'];
            if (encoding === 'gzip') {
              stream = res.pipe(zlib.createGunzip());
            } else if (encoding === 'deflate') {
              stream = res.pipe(zlib.createInflate());
            }

            let html = '';
            stream.setEncoding('utf8');
            stream.on('data', (chunk: string) => {
              html += chunk;
            });
            stream.on('end', () => {
              resolve(html);
            });
            stream.on('error', reject);
          });

          req.on('error', reject);
          req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
          req.end();
        });

        const $ = cheerio.load(html);

        // Helper function to safely extract text with depth limit
        const safeText = (selector: string, maxLength: number = 200): string => {
          try {
            const element = $(selector).first();
            if (!element.length) return '';
            
            // Get text content without deep recursion
            const textNodes = element.contents().filter(function() {
              return this.type === 'text';
            });
            
            let text = '';
            textNodes.each((i, el) => {
              if (text.length < maxLength) {
                text += $(el).text();
              }
            });
            
            return text.substring(0, maxLength);
          } catch (e) {
            console.warn(`Failed to extract text from ${selector}:`, e);
            return '';
          }
        };

        // Extract basic metadata from HTML
        const basicMetadata = {
          title: $('meta[property="og:title"]').attr('content') || 
                 safeText('title', 100) || 
                 safeText('h1', 100),
          description: $('meta[property="og:description"]').attr('content') || 
                      $('meta[name="description"]').attr('content') || 
                      safeText('p', 200),
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

            // Extract main content text for AI analysis safely
            let contentSample = '';
            
            // Try to get content from specific content areas first
            const contentSelectors = ['main', 'article', '[role="main"]', '.content', '#content'];
            for (const selector of contentSelectors) {
              contentSample = safeText(selector, 3000);
              if (contentSample.length > 100) break; // Found meaningful content
            }
            
            // If no content found, get body text more carefully
            if (contentSample.length < 100) {
              // Get all paragraph text
              const paragraphs: string[] = [];
              $('p').slice(0, 20).each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > 20) {
                  paragraphs.push(text);
                }
              });
              contentSample = paragraphs.join(' ').substring(0, 3000);
            }
            
            contentSample = cleanText(contentSample);

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