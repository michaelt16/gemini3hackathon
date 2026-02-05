import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface MessageInput {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * POST /api/conversations
 * Save a conversation transcript and individual messages.
 * Body: {
 *   photo_id: string (UUID of the photo this conversation is about),
 *   messages: Array<{ role: 'user' | 'assistant', content: string, timestamp: number }>,
 *   duration_seconds?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photo_id: photoId, messages, duration_seconds: durationSeconds } = body;

    if (!photoId || typeof photoId !== 'string') {
      return NextResponse.json({ error: 'photo_id is required' }, { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required and must not be empty' }, { status: 400 });
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json({ error: 'Each message must have role: "user" | "assistant"' }, { status: 400 });
      }
      if (typeof msg.content !== 'string') {
        return NextResponse.json({ error: 'Each message must have content string' }, { status: 400 });
      }
    }

    const supabase = createServerClient();

    // Verify photo exists
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, event_id')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Create conversation record with transcript JSON
    const transcript = JSON.stringify(messages);
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        photo_id: photoId,
        transcript,
        duration_seconds: durationSeconds ?? null,
      })
      .select('id, photo_id, created_at')
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      return NextResponse.json({ error: convError.message }, { status: 502 });
    }

    // Insert individual messages
    const messageRows = (messages as MessageInput[]).map((msg, index) => ({
      conversation_id: conversation.id,
      role: msg.role,
      content: msg.content,
      timestamp_ms: msg.timestamp ?? index * 1000, // fallback to index-based timing
    }));

    const { error: msgError } = await supabase
      .from('messages')
      .insert(messageRows);

    if (msgError) {
      console.error('Error inserting messages:', msgError);
      // Conversation was created, messages failed - log but don't fail
    }

    // Create a basic photo_stories record so has_story = true immediately
    // The extract-facts endpoint will enrich this later with AI-extracted facts
    const userMessages = (messages as MessageInput[])
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');
    
    // Create a simple summary from the first user message
    const simpleSummary = userMessages.length > 200 
      ? userMessages.substring(0, 200) + '...' 
      : userMessages || 'Story recorded';

    // Check if photo_stories record already exists
    const { data: existingStory } = await supabase
      .from('photo_stories')
      .select('id')
      .eq('photo_id', photoId)
      .single();

    if (!existingStory) {
      // Create new record
      const { error: storyError } = await supabase
        .from('photo_stories')
        .insert({
          photo_id: photoId,
          conversation_summary: simpleSummary,
          completeness_score: 20, // Basic score - will be updated by extract-facts
          who_facts: [],
          what_facts: [],
          when_facts: [],
          where_facts: [],
          why_facts: [],
        });

      if (storyError) {
        console.error('Error creating photo_stories:', storyError);
        // Don't fail - conversation was saved successfully
      } else {
        console.log('Created photo_stories record for photo:', photoId);
      }
    }

    return NextResponse.json({
      id: conversation.id,
      photo_id: conversation.photo_id,
      event_id: photo.event_id,
      message_count: messages.length,
      created_at: conversation.created_at,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Conversation save error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/conversations?photo_id=xxx
 * Get conversations for a specific photo.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photo_id');

    if (!photoId) {
      return NextResponse.json({ error: 'photo_id query param is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        photo_id,
        transcript,
        duration_seconds,
        created_at,
        messages (
          id,
          role,
          content,
          timestamp_ms,
          created_at
        )
      `)
      .eq('photo_id', photoId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json(conversations);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
