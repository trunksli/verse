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
    const response = await ai.models.list();
    console.log('\n--- Supported Models ---');
    for (const model of response.models || []) {
      console.log(`- ${model.name} (DisplayName: ${model.displayName})`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
    }
  } catch (error: any) {
    console.error('Failed to list models:', error.message || error);
  }
}

run();
