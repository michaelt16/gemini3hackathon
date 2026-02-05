import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * PUT /api/events/[id]/narration/segment
 * Update or regenerate a single segment of the narration.
 * Body: { photo_id: string, text?: string, regenerate?: boolean }
 */

interface ScriptSegment {
  photo_id: string;
  order: number;
  text: string;
  word_count: number;
}

const SEGMENT_REGEN_PROMPT = `You are regenerating a single narration segment for a photo in a video slideshow.

Context:
- Previous segment: "{prev_text}"
- Next segment: "{next_text}"
- This photo's facts: {photo_facts}

Generate a new ~20-25 word narration for this photo that:
1. Flows naturally from the previous segment
2. Transitions smoothly to the next segment
3. Captures the essence of this photo's story
4. Maintains the warm, personal storytelling tone

Return ONLY the narration text, no JSON or extra formatting.`;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(apiKey);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { photo_id: photoId, text, regenerate = false } = body;

    if (!photoId) {
      return NextResponse.json({ error: 'photo_id is required' }, { status: 400 });
    }

    if (!regenerate && !text) {
      return NextResponse.json({ error: 'Either text or regenerate=true is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get existing narration
    const { data: narration, error: narrationError } = await supabase
      .from('album_narrations')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (narrationError || !narration) {
      return NextResponse.json({ error: 'Narration not found. Generate narration first.' }, { status: 404 });
    }

    let segments: ScriptSegment[] = narration.script_segments as ScriptSegment[];
    const segmentIndex = segments.findIndex(s => s.photo_id === photoId);

    if (segmentIndex === -1) {
      return NextResponse.json({ error: 'Photo not found in narration' }, { status: 404 });
    }

    let newText: string;

    if (regenerate) {
      // Get photo story for context
      const { data: story } = await supabase
        .from('photo_stories')
        .select('conversation_summary, who_facts, what_facts, when_facts, where_facts, why_facts')
        .eq('photo_id', photoId)
        .single();

      const photoFacts = story ? [
        story.conversation_summary && `Summary: ${story.conversation_summary}`,
        story.who_facts?.length && `Who: ${story.who_facts.join(', ')}`,
        story.what_facts?.length && `What: ${story.what_facts.join(', ')}`,
        story.when_facts?.length && `When: ${story.when_facts.join(', ')}`,
        story.where_facts?.length && `Where: ${story.where_facts.join(', ')}`,
        story.why_facts?.length && `Why: ${story.why_facts.join(', ')}`,
      ].filter(Boolean).join('; ') : 'No facts available';

      const prevText = segmentIndex > 0 ? segments[segmentIndex - 1].text : '(This is the opening)';
      const nextText = segmentIndex < segments.length - 1 ? segments[segmentIndex + 1].text : '(This is the closing)';

      const prompt = SEGMENT_REGEN_PROMPT
        .replace('{prev_text}', prevText)
        .replace('{next_text}', nextText)
        .replace('{photo_facts}', photoFacts);

      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const result = await model.generateContent(prompt);
      newText = result.response.text().trim();
      
      // Clean up any quotes or extra formatting
      newText = newText.replace(/^["']|["']$/g, '').trim();
    } else {
      newText = text;
    }

    // Update the segment
    segments[segmentIndex] = {
      ...segments[segmentIndex],
      text: newText,
      word_count: newText.split(/\s+/).length,
    };

    // Rebuild full script
    const fullScript = segments.map(s => s.text).join(' ');

    // Save back to database
    const { error: updateError } = await supabase
      .from('album_narrations')
      .update({
        script_segments: segments,
        full_script: fullScript,
      })
      .eq('id', narration.id);

    if (updateError) {
      console.error('Failed to update narration:', updateError);
      return NextResponse.json({ error: 'Failed to save changes' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      segment: segments[segmentIndex],
      full_script: fullScript,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Segment update error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
