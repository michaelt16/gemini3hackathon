import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/prompts/[id]/answer
 * Save an answer to a family prompt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promptId } = await params;
    
    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { answer_text } = body;

    if (!answer_text) {
      return NextResponse.json({ error: 'answer_text is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Update the prompt with the answer
    const { data: prompt, error } = await supabase
      .from('family_prompts')
      .update({
        answer_text,
        answered_at: new Date().toISOString(),
      })
      .eq('id', promptId)
      .select()
      .single();

    if (error) {
      console.error('Error saving answer:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optionally: Also add to the photo's story if photo_id exists
    if (prompt.photo_id) {
      // Get the photo to find its existing story or create one
      const { data: existingStory } = await supabase
        .from('stories')
        .select('id, full_text')
        .eq('photo_id', prompt.photo_id)
        .single();

      if (existingStory) {
        // Append to existing story
        const updatedText = existingStory.full_text 
          ? `${existingStory.full_text}\n\n[Family Question] ${answer_text}`
          : `[Family Question] ${answer_text}`;

        await supabase
          .from('stories')
          .update({ full_text: updatedText })
          .eq('id', existingStory.id);
      } else {
        // Create new story with the answer
        await supabase
          .from('stories')
          .insert({
            photo_id: prompt.photo_id,
            full_text: `[Family Question] ${answer_text}`,
            summary: answer_text.slice(0, 200),
          });
      }
    }

    return NextResponse.json({ 
      success: true, 
      prompt,
      message: 'Answer saved successfully'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Save answer error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/prompts/[id]/answer
 * Get a specific prompt with its answer
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: promptId } = await params;
    
    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: prompt, error } = await supabase
      .from('family_prompts')
      .select(`
        *,
        album_members!from_member_id (
          id,
          name,
          relationship,
          avatar_color
        ),
        photos!photo_id (
          id,
          thumbnail_url,
          cleaned_url,
          original_url
        ),
        events!event_id (
          id,
          title
        )
      `)
      .eq('id', promptId)
      .single();

    if (error) {
      console.error('Error fetching prompt:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get prompt error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
