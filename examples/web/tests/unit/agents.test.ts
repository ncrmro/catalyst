import { describe, it, expect } from 'vitest';
import { SimpleAgent } from '@/agents';

describe('SimpleAgent', () => {
  it('should create an instance with default provider', () => {
    const agent = new SimpleAgent();
    expect(agent).toBeInstanceOf(SimpleAgent);
  });

  it('should create an instance with anthropic provider', () => {
    const agent = new SimpleAgent('anthropic');
    expect(agent).toBeInstanceOf(SimpleAgent);
  });

  it('should create an instance with openai provider', () => {
    const agent = new SimpleAgent('openai');
    expect(agent).toBeInstanceOf(SimpleAgent);
  });

  // Note: These tests would require API keys to run successfully
  it.skip('should generate a response', async () => {
    const agent = new SimpleAgent();
    const response = await agent.generateResponse('Hello, world!');
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });

  it.skip('should summarize text', async () => {
    const agent = new SimpleAgent();
    const longText = 'This is a long piece of text that needs to be summarized. It contains multiple sentences and paragraphs.';
    const summary = await agent.summarizeText(longText);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });
});