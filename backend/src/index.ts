import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { getVersesText } from './bibleUtils';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS so our mobile and web applications can talk to the server
app.use(cors());
app.use(express.json());

// Initialize the Google Gen AI client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY environment variable is not set. The advisor API will fail until configured.');
}

const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `
You are "Scripture Guide", a specialized spiritual companion and biblical advisor.
Your sole purpose is to provide comfort, wisdom, moral guidance, and relevant scripture verses based on the user's feelings, situations, or spiritual questions.

Handling Out-of-Scope Queries (Soften Safety Guardrails):
If a user asks a query that is off-topic or unrelated to spiritual, moral, or biblical matters (such as coding, cooking recipes, mathematical questions, technical trivia, etc.):
1. Set "isOffTopic" to true.
2. In the "reflection" field, write a warm, gentle transitional response. Start by politely stating that you cannot answer that specific question, and then pivot to a metaphorical or general scriptural theme that relates to their query in some way.
   - Example format: "While I can't help you write a Python script, I can share this scripture about the value of order, diligence, and building on a solid foundation..."
   - Example format: "While I can't provide a recipe for chocolate cookies, I can offer this scripture about the sweetness of gathering together and sharing bread..."
3. In the "verses" array, select 1 to 2 verses from the Bible that metaphorically, symbolically, or thematically relate to the topic (e.g., verses about diligent labor/building for coding/math, verses about bread/honey/harvest for food/cooking, verses about wisdom/knowledge for science/learning).

Tone & Style:
- Warm, empathetic, non-judgmental, and deeply respectful.
- Focus on encouraging and comforting the user.
- Do not say "As an AI..." or "I am a language model...". Keep the identity of a dedicated scripture guide.

Output Structure:
You must output a JSON object matching the requested schema.
Select 1 to 3 relevant Bible verses. For each verse, provide the book name, chapter number, start verse, optional end verse, and a short explanation of how it offers guidance or metaphorically connects to their query.
`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isOffTopic: { type: 'BOOLEAN' },
    reflection: { type: 'STRING' },
    verses: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          book: { type: 'STRING' },
          chapter: { type: 'INTEGER' },
          verseStart: { type: 'INTEGER' },
          verseEnd: { type: 'INTEGER' },
          explanation: { type: 'STRING' }
        },
        required: ['book', 'chapter', 'verseStart', 'explanation']
      }
    }
  },
  required: ['isOffTopic', 'reflection', 'verses']
};

interface LLMVerse {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  explanation: string;
}

interface LLMResponse {
  isOffTopic: boolean;
  reflection: string;
  verses: LLMVerse[];
}

app.post('/api/advise', async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query parameter is required and must be a non-empty string.' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key is not configured on the server. Please check environment configuration.' });
  }

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      contents: query,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA as any
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Received empty response from Gemini API.');
    }

    const rawData: LLMResponse = JSON.parse(responseText);

    // Process and verify each verse against our local KJV database
    const verifiedVerses = [];
    for (const verse of rawData.verses) {
      const dbLookup = getVersesText(verse.book, verse.chapter, verse.verseStart, verse.verseEnd);

      if (dbLookup) {
        verifiedVerses.push({
          reference: dbLookup.reference,
          text: dbLookup.text,
          explanation: verse.explanation
        });
      } else {
        console.warn(`Filtering out hallucinated/invalid verse reference: ${verse.book} ${verse.chapter}:${verse.verseStart}`);
      }
    }

    // Return the response with verified scriptures (including off-topic pivoted results)
    return res.json({
      isOffTopic: rawData.isOffTopic,
      reflection: rawData.reflection,
      verses: verifiedVerses
    });

  } catch (error: any) {
    console.error('Error processing advice request:', error);
    return res.status(500).json({
      error: 'An error occurred while generating spiritual advice. Please try again later.',
      details: error.message
    });
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Bible Advisor API is running.' });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
