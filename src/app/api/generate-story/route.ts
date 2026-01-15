import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LiveConversationMessage, PhotoAnalysis } from '@/lib/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GenerateStoryRequest {
  sessionId: string;
  messages: LiveConversationMessage[];
  photos: Array<{
    id: string;
    imageData?: string;
    analysis?: PhotoAnalysis;
    context?: string;
    timestamp?: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateStoryRequest = await request.json();
    const { messages, photos } = body;

    console.log('=== Story Generation Request ===');
    console.log('Session ID:', body.sessionId);
    console.log('Messages count:', messages?.length);
    console.log('Photos count:', photos?.length);
    if (messages?.length > 0) {
      console.log('First message:', messages[0].content?.substring(0, 100));
      console.log('Last message:', messages[messages.length - 1].content?.substring(0, 100));
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Build conversation history text
    const conversationText = messages
      .map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        const role = msg.role === 'user' ? 'User' : 'AI';
        return `[${time}] ${role}: ${msg.content}`;
      })
      .join('\n');

    // Build photo context text
    const photoContexts = photos
      .map((photo, index) => {
        const photoNum = index + 1;
        let context = `Photo ${photoNum}:`;
        
        if (photo.analysis) {
          const analysis = photo.analysis;
          context += `\n  - People: ${analysis.people.map(p => p.description).join(', ')}`;
          context += `\n  - Location: ${analysis.setting.location}`;
          context += `\n  - Era: ${analysis.era.estimatedDecade}`;
          context += `\n  - Mood: ${analysis.mood}`;
          context += `\n  - Opening observation: ${analysis.openingObservation}`;
        }
        
        if (photo.context) {
          context += `\n  - Context: ${photo.context}`;
        }
        
        return context;
      })
      .join('\n\n');

    // Find which photos are associated with which messages
    const messagePhotoMap = new Map<string, number[]>();
    messages.forEach((msg, msgIndex) => {
      msg.associatedPhotoIds.forEach(photoId => {
        const photoIndex = photos.findIndex(p => p.id === photoId);
        if (photoIndex >= 0) {
          if (!messagePhotoMap.has(msg.id)) {
            messagePhotoMap.set(msg.id, []);
          }
          messagePhotoMap.get(msg.id)!.push(photoIndex);
        }
      });
    });

    // Build photo associations text
    const photoAssociations = Array.from(messagePhotoMap.entries())
      .map(([msgId, photoIndices]) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg) return '';
        const photoRefs = photoIndices.map(i => `Photo ${i + 1}`).join(', ');
        return `When ${msg.role === 'user' ? 'the user' : 'the AI'} said "${msg.content.substring(0, 50)}...", they were referring to ${photoRefs}`;
      })
      .filter(Boolean)
      .join('\n');

    // Build the prompt
    const prompt = `You are creating a story from a conversation about family photos. The story MUST be based on the questions asked and the photos shown during the conversation.

CONVERSATION HISTORY (Questions and Answers):
${conversationText}

PHOTOS TAKEN AND DISCUSSED:
${photoContexts || 'No photos were captured during this conversation'}

PHOTO ASSOCIATIONS (Which photos relate to which parts of the conversation):
${photoAssociations || 'No specific photo associations mentioned'}

IMPORTANT: Create a narrative story that:
1. **Directly incorporates the questions asked** - If the AI asked "Who is this?" and the user answered, include that exchange in the story
2. **References the specific photos taken** - When a photo was discussed, reference it naturally (e.g., "In the photo, we can see...", "The image shows...")
3. **Weaves together the conversation naturally** - Don't just list Q&A, create a flowing narrative
4. **Maintains chronological flow** - Follow the order of the conversation and when photos were taken
5. **Captures the emotional tone** - Preserve the warmth, curiosity, and personality from the conversation
6. **Preserves important details** - Include names, places, dates, events, and relationships mentioned
7. **Tells a complete story** - Not a transcript, but a cohesive narrative that someone reading it would understand the memory being preserved

The story should feel like someone is telling the story of these photos based on the conversation that happened. It should answer: What was happening? Who was there? Why was this moment important? What did we learn from the questions asked?

Format requirements:
- 200-500 words
- Write in past tense or present tense (choose what feels natural)
- Use descriptive language
- Include transitions between topics
- Reference photos naturally when relevant
- End with a meaningful conclusion

Generate the story now:`;

    // Generate story using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const narrative = response.text();

    // Calculate word count and estimated duration
    const wordCount = narrative.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 2.5); // ~2.5 words per second for narration

    // Generate a title from the first sentence or key theme
    const firstSentence = narrative.split(/[.!?]/)[0];
    const title = firstSentence.length > 60 
      ? firstSentence.substring(0, 60) + '...'
      : firstSentence;

    const story = {
      id: `story-${Date.now()}`,
      sessionId: body.sessionId,
      title: title.trim(),
      narrative: narrative.trim(),
      associatedPhotoIds: photos.map(p => p.id),
      wordCount,
      estimatedDuration,
      createdAt: Date.now(),
    };

    return NextResponse.json({ story });
  } catch (error) {
    console.error('Error generating story:', error);
    return NextResponse.json(
      { error: 'Failed to generate story', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
