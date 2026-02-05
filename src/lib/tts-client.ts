/**
 * TTS Client with retry logic, rate limit handling, and browser fallback
 */

interface TTSResponse {
  audio_base64?: string;
  mime_type?: string;
  duration_estimate?: number;
  error?: string;
  retry_after?: number;
  from_cache?: boolean;
}

interface TTSOptions {
  voice?: string;
  maxRetries?: number; // For network errors only (rate limits fail fast)
  useBrowserFallback?: boolean; // Use Web Speech API when Gemini fails
}

/**
 * Browser Speech Synthesis - no rate limits, works when Gemini fails
 */
export function speakWithBrowser(text: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve(0);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Female') || v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    
    const startTime = Date.now();
    utterance.onend = () => resolve(Date.now() - startTime);
    utterance.onerror = () => resolve(0);
    speechSynthesis.speak(utterance);
  });
}

// Client-side request queue to prevent flooding
let clientQueue: Promise<unknown> = Promise.resolve();
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // Minimum 500ms between requests

/**
 * Fetch TTS audio with automatic retry for rate limits
 */
export async function fetchTTS(
  text: string, 
  options: TTSOptions = {}
): Promise<TTSResponse> {
  const { voice = 'Kore', maxRetries = 2 } = options;
  
  // Queue requests to prevent simultaneous calls
  const requestPromise = clientQueue.then(async () => {
    // Ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
    
    return executeRequest(text, voice, maxRetries);
  });
  
  clientQueue = requestPromise.catch(() => {}); // Prevent unhandled rejection
  
  return requestPromise;
}

async function executeRequest(
  text: string,
  voice: string,
  maxRetries: number
): Promise<TTSResponse> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: { name: voice } }),
      });
      
      const data = await response.json();
      
      // Success
      if (response.ok && data.audio_base64) {
        return data;
      }
      
      // Rate limit - don't wait long, just fail gracefully
      if (response.status === 429) {
        // For hackathon: don't wait 30s, just return error so text can continue without audio
        console.log('TTS rate limited, continuing without audio');
        return { error: 'Rate limited' };
      }
      
      // Other error
      lastError = new Error(data.error || 'TTS request failed');
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Network error');
      
      // Retry on network errors with exponential backoff
      if (attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`TTS network error, retrying in ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }
  
  console.error('TTS failed after retries:', lastError?.message);
  return { error: lastError?.message || 'TTS failed' };
}

/**
 * Play TTS audio and return duration
 */
export async function playTTS(
  text: string,
  audioElement: HTMLAudioElement,
  options: TTSOptions = {}
): Promise<number> {
  const data = await fetchTTS(text, options);
  
  if (!data.audio_base64) {
    console.warn('No TTS audio available:', data.error);
    return 0;
  }
  
  const mimeType = data.mime_type || 'audio/wav';
  audioElement.src = `data:${mimeType};base64,${data.audio_base64}`;
  
  return new Promise((resolve) => {
    const onLoaded = () => {
      audioElement.removeEventListener('loadedmetadata', onLoaded);
      const duration = audioElement.duration * 1000;
      audioElement.play().catch(() => {});
      resolve(duration);
    };
    
    audioElement.addEventListener('loadedmetadata', onLoaded);
    
    // Fallback if metadata doesn't load
    setTimeout(() => {
      audioElement.removeEventListener('loadedmetadata', onLoaded);
      resolve(0);
    }, 2000);
  });
}

/**
 * Typewriter effect synced with TTS
 */
export async function typeWithTTS(
  text: string,
  audioElement: HTMLAudioElement,
  onTextUpdate: (text: string) => void,
  options: TTSOptions = {}
): Promise<void> {
  // Start TTS
  const duration = await playTTS(text, audioElement, options);
  
  // Typewriter effect
  const chars = text.split('');
  const msPerChar = duration > 0 
    ? Math.max(12, Math.min(45, (duration - 400) / chars.length))
    : 30; // Default speed if no audio
  
  let displayedText = '';
  
  return new Promise((resolve) => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < chars.length) {
        displayedText += chars[i];
        onTextUpdate(displayedText);
        i++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, msPerChar);
  });
}
