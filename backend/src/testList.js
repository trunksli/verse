const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY is not set in backend/.env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function run() {
  try {
    console.log('Fetching available models via JS...');
    const response = await ai.models.list();
    console.log('Response keys:', Object.keys(response));
    
    // Check if response itself is iterable
    if (Symbol.iterator in response || Symbol.asyncIterator in response) {
      console.log('Response is iterable directly.');
      for await (const model of response) {
        console.log(`- ${model.name}`);
      }
    } else if (response.models) {
      console.log('Response has .models array.');
      for (const model of response.models) {
        console.log(`- ${model.name}`);
      }
    } else {
      console.log('Unknown response structure:', response);
    }
  } catch (error) {
    console.error('Failed to list models:', error.message || error);
  }
}

run();
