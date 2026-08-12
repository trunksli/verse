import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY is not set in backend/.env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function run() {
  try {
    console.log('Fetching available models...');
    // models.list() returns an async-iterable Pager, not a { models: [] } object.
    const pager = await ai.models.list();
    console.log('\n--- Supported Models ---');
    for await (const model of pager) {
      console.log(`- ${model.name} (DisplayName: ${model.displayName})`);
      console.log(`  Supported Methods: ${model.supportedActions?.join(', ')}`);
    }
  } catch (error: any) {
    console.error('Failed to list models:', error.message || error);
  }
}

run();
