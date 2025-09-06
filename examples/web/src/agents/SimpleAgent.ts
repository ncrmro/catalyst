import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export class SimpleAgent {
  private model;

  constructor(provider: 'anthropic' | 'openai' = 'anthropic') {
    this.model = provider === 'anthropic' 
      ? anthropic('claude-3-haiku-20240307')
      : openai('gpt-3.5-turbo');
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.model,
        prompt,
      });
      return text;
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async summarizeText(text: string): Promise<string> {
    const prompt = `Please provide a concise summary of the following text:\n\n${text}`;
    return this.generateResponse(prompt);
  }

  async answerQuestion(question: string, context?: string): Promise<string> {
    const prompt = context 
      ? `Based on the following context, please answer the question:\n\nContext: ${context}\n\nQuestion: ${question}`
      : question;
    return this.generateResponse(prompt);
  }
}