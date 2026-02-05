import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/tts
 * Generate audio from text using Gemini's native TTS.
 * Body: { text: string, voice?: { name?: string } }
 * 
 * Returns: { audio_base64: string, audio_url?: string }
 */

interface TTSRequest {
  text: string;
  voice?: {
    name?: string; // Gemini voices: Kore, Puck, Charon, Fenrir, Aoede
  };
  save_to_storage?: boolean;
  storage_path?: string;
}

// Available Gemini TTS voices (same as Live API)
const GEMINI_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede'];

// ============================================================================
// CACHE ONLY - No rate limiting (let Gemini handle it, we handle 429 gracefully)
// ============================================================================

// Simple in-memory cache for TTS results (key: text+voice, value: audio data)
const ttsCache = new Map<string, { audio_base64: string; mime_type: string; cached_at: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

function getCacheKey(text: string, voice: string): string {
  return `${voice}:${text.trim().toLowerCase()}`;
}

// Clean expired cache entries
function cleanCache(): void {
  const now = Date.now();
  for (const [key, value] of ttsCache.entries()) {
    if (now - value.cached_at > CACHE_TTL) {
      ttsCache.delete(key);
    }
  }
}

// Create WAV header for PCM data
function createWavHeader(dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const header = Buffer.alloc(44);
  
  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  
  // fmt subchunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  
  // data subchunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  
  return header;
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    const { text, voice = {}, save_to_storage = false, storage_path } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Use requested voice or default to Kore (EVA's voice)
    const voiceName = GEMINI_VOICES.includes(voice.name || '') ? voice.name : 'Kore';
    
    // Check cache first
    const cacheKey = getCacheKey(text, voiceName || 'Kore');
    const cached = ttsCache.get(cacheKey);
    if (cached && Date.now() - cached.cached_at < CACHE_TTL) {
      console.log('TTS cache hit:', { textLength: text.length, voiceName });
      return NextResponse.json({
        audio_base64: cached.audio_base64,
        mime_type: cached.mime_type,
        duration_estimate: Math.ceil(text.split(/\s+/).length / 2.5),
        from_cache: true,
      });
    }
    
    // Clean old cache entries
    cleanCache();
    
    console.log('Gemini TTS request:', { voiceName, textLength: text.length });

    // Use REST API directly - generationConfig format works!
    const ttsUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    
    const ttsRequest = {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        response_modalities: ["AUDIO"],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: voiceName
            }
          }
        }
      }
    };

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let response: Response;
    try {
      response = await fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ttsRequest),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('TTS request timed out after 30s');
        return NextResponse.json({ error: 'Request timed out', timeout: true }, { status: 504 });
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini TTS API error:', response.status, errorText.slice(0, 300));
      
      // Check for rate limit from Gemini
      if (response.status === 429) {
        console.log('Gemini TTS rate limit hit - wait ~1 min for reset');
        return NextResponse.json({ 
          error: 'Gemini rate limit (10 req/min). Wait ~1 minute.', 
          retry_after: 60 
        }, { status: 429 });
      }
      
      return NextResponse.json({ error: 'TTS generation failed', details: errorText }, { status: 500 });
    }

    const ttsData = await response.json();
    
    // Extract audio from response
    const rawAudioData = ttsData?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const rawMimeType = ttsData?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';
    
    if (!rawAudioData) {
      console.error('No audio data in Gemini response:', JSON.stringify(ttsData).slice(0, 500));
      return NextResponse.json({ error: 'No audio in response' }, { status: 500 });
    }

    console.log('TTS generated successfully:', { rawMimeType, dataLength: rawAudioData.length });

    // Convert PCM to WAV if needed (Gemini returns audio/L16 PCM)
    let audioData = rawAudioData;
    let mimeType = rawMimeType;
    
    if (rawMimeType.includes('L16') || rawMimeType.includes('pcm')) {
      // Parse sample rate from mime type (e.g., "audio/L16;codec=pcm;rate=24000")
      const rateMatch = rawMimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
      
      // Decode base64 PCM data
      const pcmBuffer = Buffer.from(rawAudioData, 'base64');
      
      // Create WAV header
      const wavHeader = createWavHeader(pcmBuffer.length, sampleRate, 1, 16);
      
      // Combine header + PCM data
      const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
      
      // Re-encode as base64
      audioData = wavBuffer.toString('base64');
      mimeType = 'audio/wav';
      
      console.log('Converted PCM to WAV:', { sampleRate, pcmLength: pcmBuffer.length, wavLength: wavBuffer.length });
    }

    // Optionally save to Supabase Storage
    let audioUrl: string | undefined;
    if (save_to_storage && storage_path) {
      const supabase = createServerClient();
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      const { error: uploadError } = await supabase.storage
        .from('audio-narrations')
        .upload(storage_path, audioBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Failed to upload audio:', uploadError);
      } else {
        const { data: urlData } = supabase.storage
          .from('audio-narrations')
          .getPublicUrl(storage_path);
        audioUrl = urlData.publicUrl;
      }
    }

    // Cache the result
    ttsCache.set(cacheKey, {
      audio_base64: audioData,
      mime_type: mimeType,
      cached_at: Date.now(),
    });
    console.log('TTS cached:', { cacheKey: cacheKey.slice(0, 50), cacheSize: ttsCache.size });

    return NextResponse.json({
      audio_base64: audioData,
      audio_url: audioUrl,
      mime_type: mimeType,
      duration_estimate: Math.ceil(text.split(/\s+/).length / 2.5), // ~2.5 words per second
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('TTS error:', message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
