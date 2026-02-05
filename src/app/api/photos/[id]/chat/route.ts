import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * POST /api/photos/[id]/chat
 * Simple chat about a single photo using regular Gemini API (not Live).
 * Body: { message: string, history?: { role: string, content: string }[] }
 */

const SYSTEM_PROMPT = `You are a warm, friendly AI helping someone share memories about an old photograph. Your goal is to help them capture the story behind the photo through natural conversation.

Guidelines:
- Be conversational and warm, like a good friend asking about the photo
- Ask follow-up questions to get more details (who, what, when, where, why)
- Show genuine interest in the memories being shared
- Keep responses concise (2-3 sentences max)
- If they seem done, acknowledge the story warmly

Start by acknowledging what you can see in the photo (if provided) and ask them to tell you about it.`;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(apiKey);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params;
    
    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch the photo to get its URL
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, original_url, cleaned_url')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build conversation history for Gemini
    const chatHistory = history.map((h: { role: string; content: string }) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));

    // Start chat with system prompt
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: "I'd love to hear about this photo! Tell me, what's the story here? Who do we see, and what was happening when this was taken?" }] },
        ...chatHistory,
      ],
    });

    // Send user message
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    // Store the message in the database
    // First, find or create a conversation for this photo
    let conversationId: string;

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ photo_id: photoId })
        .select('id')
        .single();

      if (convError || !newConv) {
        console.error('Failed to create conversation:', convError);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }
      conversationId = newConv.id;
    }

    // Store both messages
    const now = Date.now();
    await supabase.from('messages').insert([
      { conversation_id: conversationId, role: 'user', content: message, timestamp_ms: now },
      { conversation_id: conversationId, role: 'assistant', content: responseText, timestamp_ms: now + 1 },
    ]);

    return NextResponse.json({
      response: responseText,
      conversation_id: conversationId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Photo chat error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/photos/[id]/chat
 * Get existing chat history for a photo
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params;
    
    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get conversation for this photo
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    // Get messages
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content, timestamp_ms')
      .eq('conversation_id', conversation.id)
      .order('timestamp_ms', { ascending: true });

    return NextResponse.json({
      conversation_id: conversation.id,
      messages: messages || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get chat error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
