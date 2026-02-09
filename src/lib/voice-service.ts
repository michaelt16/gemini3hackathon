// Voice Cloning Service - Supports ElevenLabs and Google Cloud TTS
// Handles voice cloning and TTS generation

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Google Cloud TTS (free alternative)
const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY; // API key for REST API (simpler than service account)
const GOOGLE_TTS_API_URL = 'https://texttospeech.googleapis.com/v1';

export interface VoiceProfile {
  id: string;
  name: string;
  createdAt: number;
}

export interface TTSOptions {
  stability?: number; // 0.0 to 1.0
  similarityBoost?: number; // 0.0 to 1.0
  style?: number; // 0.0 to 1.0
  useSpeakerBoost?: boolean;
}

/**
 * Clone a voice from one or more audio samples
 * @param audioFiles - Array of audio file buffers (or single buffer for backward compat)
 * @param voiceName - Name for the cloned voice
 * @param description - Optional description
 * @returns Voice profile with ID
 */
export async function cloneVoice(
  audioFiles: Buffer | Buffer[],
  voiceName: string,
  description?: string
): Promise<VoiceProfile> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  // Normalize to array
  const files = Array.isArray(audioFiles) ? audioFiles : [audioFiles];
  
  if (files.length === 0) {
    throw new Error('At least one audio file is required');
  }

  try {
    // Build multipart form data manually using Web API FormData
    const formData = new globalThis.FormData();
    
    files.forEach((file, index) => {
      const blob = new Blob([file], { type: 'audio/mpeg' });
      formData.append('files', blob, `voice-sample-${index + 1}.mp3`);
    });
    
    formData.append('name', voiceName);
    
    if (description) {
      formData.append('description', description);
    }
    
    // Remove background noise for cleaner cloning
    formData.append('remove_background_noise', 'true');

    const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs clone error:', response.status, errorText);
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    return {
      id: data.voice_id,
      name: voiceName,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error('Voice cloning error:', error);
    throw error;
  }
}

/**
 * Generate TTS audio using Google Cloud TTS (free, pre-built voices)
 * @param text - Text to convert to speech
 * @param voiceName - Voice name (e.g., 'en-US-Studio-O' for natural narration)
 * @returns Audio buffer (MP3)
 */
export async function generateTTSGoogle(
  text: string,
  voiceName: string = 'en-US-Studio-O'
): Promise<Buffer> {
  if (!GOOGLE_CLOUD_API_KEY) {
    throw new Error('GOOGLE_CLOUD_API_KEY not configured');
  }

  try {
    const response = await fetch(
      `${GOOGLE_TTS_API_URL}/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            name: voiceName,
            languageCode: voiceName.split('-').slice(0, 2).join('-'), // Extract language code
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0,
            volumeGainDb: 0.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google TTS error: ${error}`);
    }

    const data = await response.json();
    const audioContent = data.audioContent;
    
    // Decode base64 audio
    return Buffer.from(audioContent, 'base64');
  } catch (error) {
    console.error('Google TTS generation error:', error);
    throw error;
  }
}

/**
 * Generate TTS audio using cloned voice (ElevenLabs) or Google TTS fallback
 * @param text - Text to convert to speech
 * @param voiceId - Cloned voice ID (ElevenLabs) or 'google' for Google TTS
 * @param options - TTS options
 * @returns Audio buffer (MP3)
 */
export async function generateTTS(
  text: string,
  voiceId: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  // If voiceId is 'google', use Google Cloud TTS (free)
  if (voiceId === 'google' || !ELEVENLABS_API_KEY) {
    return generateTTSGoogle(text);
  }

  // Otherwise use ElevenLabs
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2', // Supports multiple languages
          voice_settings: {
            stability: options.stability ?? 0.5,
            similarity_boost: options.similarityBoost ?? 0.75,
            style: options.style ?? 0.0,
            use_speaker_boost: options.useSpeakerBoost ?? true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS error: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  } catch (error) {
    console.error('TTS generation error:', error);
    throw error;
  }
}

/**
 * List all cloned voices
 */
export async function listVoices(): Promise<VoiceProfile[]> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list voices');
    }

    const data = await response.json();
    return data.voices.map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      createdAt: new Date(v.created_at).getTime(),
    }));
  } catch (error) {
    console.error('List voices error:', error);
    throw error;
  }
}

/**
 * Delete a cloned voice
 */
export async function deleteVoice(voiceId: string): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete voice');
    }
  } catch (error) {
    console.error('Delete voice error:', error);
    throw error;
  }
}
