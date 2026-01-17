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
    const prompt = `You are creating a narration story from a conversation about family photos. This story will be narrated over photos in a photo album, so it should be a pure narrative - NOT a transcript of the conversation.

CONVERSATION HISTORY (for context only - extract the story, don't include the Q&A format):
${conversationText}

PHOTOS TAKEN AND DISCUSSED:
${photoContexts || 'No photos were captured during this conversation'}

PHOTO ASSOCIATIONS (Which photos relate to which parts of the conversation):
${photoAssociations || 'No specific photo associations mentioned'}

CRITICAL INSTRUCTIONS:
1. **Write as a pure narration** - This is a story being told, NOT a conversation transcript. Remove all references to "AI", "I asked", "the user said", "conversation", etc.
2. **First-person perspective** - Write as if the person is telling their own story (e.g., "The old photo album lay open on my lap...", "I decided to share one...")
3. **Extract the story from the conversation** - Take the information shared (names, places, dates, memories, emotions) and weave it into a flowing narrative
4. **Reference photos naturally** - When mentioning photos, do it naturally (e.g., "The image showed...", "In the photo, we can see...", "The picture captured...")
5. **Maintain chronological flow** - Follow the order of when things were discussed
6. **Preserve all important details** - Include names, places, dates, events, relationships, and emotions mentioned
7. **Create emotional depth** - Capture the warmth, nostalgia, and significance of the memory
8. **Tell a complete story** - Answer: What was happening? Who was there? Why was this moment important? What makes this memory special?

The story should feel like someone is narrating their memory while looking through a photo album. It should be personal, warm, and complete.

Format requirements:
- 200-500 words
- Write in first-person past tense (e.g., "I was...", "We were...", "It was...")
- Use descriptive, evocative language
- Include sensory details when mentioned (sounds, smells, feelings)
- Flow naturally from one thought to the next
- End with a meaningful reflection or conclusion about why this memory matters

Example style:
"The old photo album lay open on my lap, the brittle pages whispering with each turn. I decided to share one, a snapshot from what felt like another lifetime. The image displayed a moment from our family trip - the four of us at the beach, squinting in the bright Indonesian sun..."

Generate the pure narration story now (NO conversation format, NO AI references, just the story):`;

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
