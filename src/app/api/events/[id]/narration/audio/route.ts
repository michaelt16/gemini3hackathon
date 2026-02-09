import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateTTS } from '@/lib/voice-service';

/**
 * POST /api/events/[id]/narration/audio
 * Generate audio for all segments in the album narration.
 * Supports: Google Cloud TTS (default) or ElevenLabs cloned voice (pass voiceId).
 * Body: { voiceId?: string } - if provided, uses ElevenLabs cloned voice
 */

interface ScriptSegment {
  photo_id: string;
  order: number;
  text: string;
  word_count: number;
  audio_url?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    // Check for cloned voice ID in body
    let voiceId: string | null = null;
    try {
      const body = await request.json();
      voiceId = body.voiceId || null;
    } catch {
      // No body or invalid JSON — use default Google TTS
    }

    const useElevenLabs = !!voiceId && !!process.env.ELEVENLABS_API_KEY;

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

    const segments: ScriptSegment[] = narration.script_segments || [];
    
    if (segments.length === 0) {
      return NextResponse.json({ error: 'No segments to generate audio for' }, { status: 400 });
    }

    // Generate audio for each segment
    const audioSegments: { photo_id: string; audio_base64: string; duration: number }[] = [];
    
    for (const segment of segments) {
      let audioBase64: string;

      if (useElevenLabs && voiceId) {
        // Use ElevenLabs with cloned voice
        try {
          console.log(`Generating ElevenLabs TTS for segment ${segment.order} with voice ${voiceId}`);
          const audioBuffer = await generateTTS(segment.text, voiceId, {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true,
          });
          audioBase64 = audioBuffer.toString('base64');
        } catch (err) {
          console.error(`ElevenLabs TTS failed for segment ${segment.order}:`, err);
          continue;
        }
      } else {
        // Use Google Cloud TTS (default)
        const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
        if (!apiKey) {
          return NextResponse.json({ error: 'GOOGLE_CLOUD_API_KEY not configured' }, { status: 500 });
        }
        const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
        
        const ttsRequest = {
          input: { text: segment.text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Studio-O',
            ssmlGender: 'FEMALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.95,
            pitch: 0,
          },
        };

        const ttsResponse = await fetch(ttsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ttsRequest),
        });

        if (!ttsResponse.ok) {
          console.error(`Google TTS failed for segment ${segment.order}`);
          continue;
        }

        const ttsData = await ttsResponse.json();
        audioBase64 = ttsData.audioContent;
      }

      const duration = Math.ceil(segment.word_count / 2.5); // ~2.5 words per second

      // Upload to storage
      const storagePath = `${eventId}/${segment.photo_id}.mp3`;
      const audioBuffer = Buffer.from(audioBase64, 'base64');

      const { error: uploadError } = await supabase.storage
        .from('audio-narrations')
        .upload(storagePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error(`Failed to upload audio for segment ${segment.order}:`, uploadError);
      }

      const { data: urlData } = supabase.storage
        .from('audio-narrations')
        .getPublicUrl(storagePath);

      audioSegments.push({
        photo_id: segment.photo_id,
        audio_base64: audioBase64,
        duration,
      });

      // Update segment with audio URL
      segment.audio_url = urlData.publicUrl;
    }

    // Update narration with audio-enriched segments
    const totalDuration = audioSegments.reduce((acc, s) => acc + s.duration, 0);

    const { error: updateError } = await supabase
      .from('album_narrations')
      .update({
        script_segments: segments,
        duration_seconds: totalDuration,
      })
      .eq('id', narration.id);

    if (updateError) {
      console.error('Failed to update narration with audio:', updateError);
    }

    return NextResponse.json({
      success: true,
      segments_processed: audioSegments.length,
      total_duration: totalDuration,
      segments: segments.map(s => ({
        photo_id: s.photo_id,
        order: s.order,
        audio_url: s.audio_url,
        duration: Math.ceil(s.word_count / 2.5),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Audio generation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/events/[id]/narration/audio
 * Get audio URLs for all segments
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: narration, error } = await supabase
      .from('album_narrations')
      .select('script_segments, duration_seconds')
      .eq('event_id', eventId)
      .single();

    if (error || !narration) {
      return NextResponse.json({ segments: [], has_audio: false });
    }

    const segments = (narration.script_segments as ScriptSegment[]) || [];
    const hasAudio = segments.some(s => s.audio_url);

    return NextResponse.json({
      segments: segments.map(s => ({
        photo_id: s.photo_id,
        order: s.order,
        text: s.text,
        audio_url: s.audio_url,
        duration: Math.ceil(s.word_count / 2.5),
      })),
      has_audio: hasAudio,
      total_duration: narration.duration_seconds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get audio error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
