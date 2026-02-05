import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { albumTitle, contextType, contextDescription, clips } = await request.json();

    console.log('Generate narration request:', { albumTitle, contextType, clipsCount: clips?.length });

    if (!clips || clips.length === 0) {
      return NextResponse.json(
        { error: 'No clips provided' },
        { status: 400 }
      );
    }

    // Use a stable model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    console.log('Clips data:', JSON.stringify(clips, null, 2));

    // Build the prompt
    const clipsDescription = clips.map((clip: { order: number; story: string; hasAnimation: boolean }) => 
      `Clip ${clip.order}: ${clip.story}${clip.hasAnimation ? ' (has video animation)' : ' (static photo)'}`
    ).join('\n');

    const prompt = `You are a storyteller creating narration for a photo/video album called "${albumTitle}".

Album Context: ${contextDescription}

Here are the clips in order:
${clipsDescription}

Please create:
1. A cohesive narration that flows through all ${clips.length} clips
2. Individual narration text for each clip that can be used as voiceover

Guidelines:
- CRITICAL: Keep each clip's narration to 10-15 words MAX (must fit in 5 seconds when spoken quickly)
- Make the narration emotional and personal
- ${contextType === 'single_event' ? 'Connect all clips as one continuous story' : contextType === 'memory_collection' ? 'Treat each as a distinct moment but create smooth transitions' : 'Find thematic connections between clips'}
- Don't describe what's visible, instead add emotional context and memories
- Use first person (I, we, my, our) to make it personal
- Example good length: "This was the moment everything changed for our family."

Respond in JSON format:
{
  "narration": "The full combined narration text",
  "clipTexts": ["Narration for clip 1", "Narration for clip 2", ...]
}`;

    console.log('Calling Gemini with prompt length:', prompt.length);
    const result = await model.generateContent(prompt);
    console.log('Got Gemini response');
    const response = result.response;
    const text = response.text();
    console.log('Response text:', text.substring(0, 500));

    // Parse JSON from response
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          narration: parsed.narration || '',
          clipTexts: parsed.clipTexts || [],
        });
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
    }

    // Fallback: return the raw text as narration
    return NextResponse.json({
      narration: text,
      clipTexts: [],
    });

  } catch (error) {
    console.error('Generate narration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate narration';
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
