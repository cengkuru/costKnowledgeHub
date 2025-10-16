/**
 * Simple test script to verify PDF generation works
 * Run with: node api/test-pdf.js
 */

import { generatePDFBuffer } from './src/services/pdfGenerator.js';
import { writeFileSync } from 'fs';

const testData = {
  bullets: [
    {
      text: 'Infrastructure transparency is crucial for public accountability and effective project management.',
      cites: [
        {
          title: 'CoST Infrastructure Transparency Initiative',
          url: 'https://infrastructuretransparency.org'
        },
        {
          title: 'Best Practices Guide 2024',
          url: 'https://example.com/guide'
        }
      ]
    },
    {
      text: 'Project disclosure requirements should include detailed cost breakdowns and timelines.',
      cites: [
        {
          title: 'Disclosure Framework Manual',
          url: 'https://example.com/manual'
        }
      ]
    },
    {
      text: 'Regular monitoring and evaluation help identify issues early and prevent cost overruns.',
      cites: [
        {
          title: 'Monitoring Best Practices',
          url: 'https://example.com/monitoring'
        },
        {
          title: 'Evaluation Framework 2023',
          url: 'https://example.com/evaluation'
        }
      ]
    }
  ],
  items: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5']
};

async function test() {
  try {
    console.log('Generating PDF...');
    const buffer = await generatePDFBuffer(testData, {
      title: 'Test Export - CoST Knowledge Hub',
      includeAnswers: true,
      includeSources: true
    });

    console.log(`✓ PDF generated successfully (${buffer.length} bytes)`);

    // Save to file
    writeFileSync('test-export.pdf', buffer);
    console.log('✓ Saved to test-export.pdf');
    console.log('\nOpen test-export.pdf to verify the card-based layout!');
  } catch (error) {
    console.error('✗ PDF generation failed:', error);
    process.exit(1);
  }
}

test();
