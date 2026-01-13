import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
};

// Analyze a photo using Gemini Vision
export async function analyzePhoto(imageBase64: string, mimeType: string = 'image/jpeg') {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const { PHOTO_ANALYSIS_PROMPT } = await import('./prompts');

  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    },
    PHOTO_ANALYSIS_PROMPT,
  ]);

  const response = result.response;
  const text = response.text();
  
  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse photo analysis response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

// Chat with context about the photo
export async function chat(
  systemPrompt: string,
  userMessage: string
) {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    systemPrompt,
    `Elderly Person: ${userMessage}`,
  ]);

  const response = result.response;
  return response.text();
}

// Start a conversation about a photo
export async function startConversation(photoAnalysis: string) {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const { buildConversationPrompt } = await import('./prompts');
  
  const prompt = buildConversationPrompt(
    photoAnalysis,
    [], // Empty history for start
    { names: [], places: [], dates: [] }
  );

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}
