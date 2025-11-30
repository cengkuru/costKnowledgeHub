/**
 * Tests for Claude Haiku 4.5 Prompt Building
 *
 * These tests verify the two-stage image generation architecture:
 * - Stage 1: Claude Haiku 4.5 builds HBR-style conceptual prompts
 * - Stage 2: Gemini 3 Pro generates images from crafted prompts
 */

import { aiService } from '../../services/aiService';
import { topicService } from '../../services/topicService';
import config from '../../config';
import fs from 'fs';
import path from 'path';

describe('Haiku Prompt Builder Tests', () => {
  describe('Configuration Verification', () => {
    it('should have Anthropic API key configured', () => {
      expect(config.anthropicApiKey).toBeDefined();
      expect(config.anthropicApiKey.length).toBeGreaterThan(0);
      console.log('Anthropic API Key configured:', config.anthropicApiKey ? 'YES' : 'NO');
    });

    it('should use Claude Haiku 4.5 model', () => {
      // Read the aiService file to verify model configuration
      const aiServicePath = path.join(__dirname, '../../services/aiService.ts');
      const content = fs.readFileSync(aiServicePath, 'utf-8');

      // Verify we're using Claude Haiku 4.5
      expect(content).toContain('claude-haiku-4-5-20251001');
      console.log('Verified: Claude Haiku 4.5 model is configured');
    });

    it('should have proper system prompt for HBR-style illustrations', () => {
      const aiServicePath = path.join(__dirname, '../../services/aiService.ts');
      const content = fs.readFileSync(aiServicePath, 'utf-8');

      // Verify key elements of the system prompt
      expect(content).toContain('Harvard Business Review');
      expect(content).toContain('ONE clear metaphor');
      expect(content).toContain('headline test');
      expect(content).toContain('CoST');
      expect(content).toContain('Infrastructure Transparency');

      console.log('Verified: System prompt contains HBR-style instructions');
    });

    it('should include reference metaphors for CoST topics', () => {
      const aiServicePath = path.join(__dirname, '../../services/aiService.ts');
      const content = fs.readFileSync(aiServicePath, 'utf-8');

      // Verify reference metaphors are present
      expect(content).toContain('Data Standards');
      expect(content).toContain('Universal adapter');
      expect(content).toContain('Peeling back');
      expect(content).toContain('Capacity Building');
      expect(content).toContain('Country Programs');
      expect(content).toContain('Tools');
      expect(content).toContain('Transparency');

      console.log('Verified: Reference metaphors for CoST topics included');
    });
  });

  describe('Prompt Building Function', () => {
    it('should have buildPromptWithHaiku function exported', () => {
      expect(aiService.buildPromptWithHaiku).toBeDefined();
      expect(typeof aiService.buildPromptWithHaiku).toBe('function');
    });

    it('should build a prompt for a known topic (OC4IDS)', async () => {
      const topicName = 'OC4IDS';
      const description = 'Standards for open contracting in infrastructure';

      const prompt = await aiService.buildPromptWithHaiku(topicName, description);

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(50);
      expect(prompt.toLowerCase()).toContain('illustration');

      console.log('Generated prompt for OC4IDS:', prompt.substring(0, 150) + '...');
    }, 30000);

    it('should build a prompt for Independent Review topic', async () => {
      const topicName = 'Independent Review';
      const description = 'Verification and validation of infrastructure projects';

      const prompt = await aiService.buildPromptWithHaiku(topicName, description);

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(50);

      console.log('Generated prompt for Independent Review:', prompt.substring(0, 150) + '...');
    }, 30000);

    it('should build a prompt for unknown/new topic', async () => {
      const topicName = 'Climate Finance Tracking';
      const description = 'Monitoring climate-related infrastructure investments';

      const prompt = await aiService.buildPromptWithHaiku(topicName, description);

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(50);
      // Should still be in CoST context
      expect(prompt.toLowerCase()).toContain('illustration');

      console.log('Generated prompt for new topic:', prompt.substring(0, 150) + '...');
    }, 30000);

    it('should handle topics with minimal description', async () => {
      const topicName = 'Tools';
      const description = '';

      const prompt = await aiService.buildPromptWithHaiku(topicName, description);

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(50);

      console.log('Generated prompt for minimal description:', prompt.substring(0, 150) + '...');
    }, 30000);
  });

  describe('Prompt Quality Checks', () => {
    it('should generate prompts that avoid common AI image pitfalls', async () => {
      const topicName = 'Infrastructure Transparency Index';
      const description = 'Measuring transparency in public infrastructure';

      const prompt = await aiService.buildPromptWithHaiku(topicName, description);

      // Should NOT contain these problematic elements
      expect(prompt.toLowerCase()).not.toContain('3d render');
      expect(prompt.toLowerCase()).not.toContain('photorealistic');
      expect(prompt.toLowerCase()).not.toContain('detailed face');

      // Should contain style guidance
      expect(prompt.toLowerCase()).toMatch(/(flat|isometric|editorial|illustration)/);

      console.log('Prompt quality check passed:', prompt.substring(0, 100) + '...');
    }, 30000);

    it('should generate prompts with color guidance', async () => {
      const topicName = 'Capacity Building';
      const description = 'Building institutional capacity for transparency';

      const prompt = await aiService.buildPromptWithHaiku(topicName, description);

      // Should mention colors
      expect(prompt.toLowerCase()).toMatch(/(color|teal|amber|terracotta|cream|gray)/);

      console.log('Color guidance check passed');
    }, 30000);
  });

  describe('Integration with Topic Service', () => {
    it('should use Haiku prompt builder in generateTopicImage', () => {
      const topicServicePath = path.join(__dirname, '../../services/topicService.ts');
      const content = fs.readFileSync(topicServicePath, 'utf-8');

      // Verify the integration
      expect(content).toContain('buildPromptWithHaiku');
      expect(content).toContain('Stage 1');
      expect(content).toContain('Stage 2');

      console.log('Verified: topicService uses Haiku prompt builder');
    });

    it('should have fallback when Haiku fails', () => {
      const aiServicePath = path.join(__dirname, '../../services/aiService.ts');
      const content = fs.readFileSync(aiServicePath, 'utf-8');

      // Verify fallback exists
      expect(content).toContain('Falling back to default prompt');
      expect(content).toContain('catch');

      console.log('Verified: Fallback mechanism exists');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete Haiku prompt building within 10 seconds', async () => {
      const startTime = Date.now();

      const prompt = await aiService.buildPromptWithHaiku(
        'Test Topic',
        'A test topic for benchmarking'
      );

      const duration = Date.now() - startTime;

      expect(prompt).toBeDefined();
      expect(duration).toBeLessThan(10000); // 10 seconds max

      console.log(`Haiku prompt building took: ${duration}ms`);
    }, 15000);
  });
});

describe('Two-Stage Architecture Verification', () => {
  it('should have correct architecture flow documented', () => {
    const topicServicePath = path.join(__dirname, '../../services/topicService.ts');
    const content = fs.readFileSync(topicServicePath, 'utf-8');

    // Verify comments document the architecture
    expect(content).toContain('Claude Haiku');
    expect(content).toContain('Gemini');

    console.log('Architecture documentation verified');
  });

  it('should call Haiku before Gemini in generateTopicImage', () => {
    const topicServicePath = path.join(__dirname, '../../services/topicService.ts');
    const content = fs.readFileSync(topicServicePath, 'utf-8');

    // Find the generateTopicImage function
    const funcMatch = content.match(/async generateTopicImage[\s\S]*?^\s{2}\},/m);
    expect(funcMatch).toBeTruthy();

    if (funcMatch) {
      const funcContent = funcMatch[0];
      const haikuIndex = funcContent.indexOf('buildPromptWithHaiku');
      const geminiIndex = funcContent.indexOf('generateImage');

      // Haiku should come before Gemini
      expect(haikuIndex).toBeLessThan(geminiIndex);
      expect(haikuIndex).toBeGreaterThan(-1);
      expect(geminiIndex).toBeGreaterThan(-1);

      console.log('Verified: Haiku is called before Gemini');
    }
  });
});
