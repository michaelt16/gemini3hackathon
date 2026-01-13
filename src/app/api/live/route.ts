import { GoogleGenerativeAI } from '@google/generative-ai';

// This API route handles live multimodal conversations with Gemini
// It accepts video frames and text, and streams back responses

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, message, conversationHistory = [] } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    // Build the content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // System context for live conversation
    const systemContext = `You are a friendly, warm AI assistant helping someone explore and share memories through their photos. 
You can see what they're showing you through their camera.

Your personality:
- Warm, encouraging, and genuinely curious about their stories
- Ask thoughtful follow-up questions that dig deeper into emotions and relationships
- Notice small details in the photos and ask about them
- Help them articulate memories they might not have words for yet

Guidelines:
- Keep responses conversational and brief (2-3 sentences max)
- If you can see a photo/image, describe what you notice and ask about it
- If they're showing you something new, acknowledge the change
- Remember context from the conversation

Current conversation context:
${conversationHistory.map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`).join('\n')}
`;

    parts.push({ text: systemContext });

    // Add the image if provided
    if (imageBase64) {
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      });
    }

    // Add the user's message
    if (message) {
      parts.push({ text: `User says: ${message}` });
    } else if (imageBase64) {
      parts.push({ text: 'User is showing you something through their camera. What do you see? Ask them about it.' });
    }

    // Generate response with streaming
    const result = await model.generateContentStream(parts);

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Live API error:', error);
    return Response.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
