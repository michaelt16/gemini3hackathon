// Grok Imagine Video Generation Service
// Uses xAI's Grok Imagine API to animate images into videos
// Alternative to VEO 3, especially for photos with minors

const XAI_API_BASE = 'https://api.x.ai/v1';

// Get API key at runtime (not module load time)
function getApiKey(): string | undefined {
  return process.env.XAI_API_KEY;
}

export interface GrokVideoConfig {
  duration?: number; // 1-15 seconds
  resolution?: '720p' | '480p';
  aspectRatio?: '16:9' | '9:16' | '4:3' | '1:1';
  prompt?: string;
}

export interface GrokVideoResult {
  videoUrl?: string;
  duration: number;
  status: 'completed' | 'processing' | 'failed';
  requestId?: string;
  error?: string;
}

/**
 * Start video generation from image using Grok Imagine
 * @param imageUrl - URL of the image (or base64 data URL)
 * @param config - Video generation configuration
 * @returns Request ID for polling
 */
export async function startGrokVideoGeneration(
  imageUrl: string,
  config: GrokVideoConfig = {}
): Promise<{ requestId: string } | { error: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('🎬 [Grok Imagine] XAI_API_KEY not found in environment');
    return { error: 'XAI_API_KEY not configured' };
  }

  const {
    duration = 5,
    resolution = '720p',
    aspectRatio = '16:9',
    prompt = 'Bring this photograph to life, dont change the faces, dont make them talk. I want movements from the photos that make it feel like im reliving the moment.',
  } = config;

  try {
    console.log('🎬 [Grok Imagine] Starting video generation...');
    console.log('🎬 [Grok Imagine] Config:', { duration, resolution, aspectRatio });
    console.log('🎬 [Grok Imagine] Image URL:', imageUrl.substring(0, 100));

    const requestBody = {
      model: 'grok-imagine-video',
      prompt: prompt,
      image: { url: imageUrl },
      duration: duration,
      resolution: resolution,
      aspect_ratio: aspectRatio,
    };

    console.log('🎬 [Grok Imagine] Request body:', JSON.stringify(requestBody, null, 2).substring(0, 500));

    const response = await fetch(`${XAI_API_BASE}/videos/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('🎬 [Grok Imagine] Response status:', response.status);
    console.log('🎬 [Grok Imagine] Response body:', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('🎬 [Grok Imagine] API error:', response.status, responseText);
      return { error: `Grok Imagine API error (${response.status}): ${responseText}` };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { error: `Failed to parse response: ${responseText}` };
    }
    
    console.log('🎬 [Grok Imagine] Request started, ID:', data.request_id);

    return { requestId: data.request_id };
  } catch (error) {
    console.error('🎬 [Grok Imagine] Error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Poll for video generation result
 * @param requestId - Request ID from startGrokVideoGeneration
 * @returns Video result
 */
export async function pollGrokVideoResult(
  requestId: string
): Promise<GrokVideoResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { duration: 0, status: 'failed', error: 'XAI_API_KEY not configured' };
  }

  try {
    // Correct endpoint for polling: /v1/videos/{request_id}
    const response = await fetch(`${XAI_API_BASE}/videos/${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const responseText = await response.text();
    console.log('🎬 [Grok Imagine] Poll response status:', response.status);
    console.log('🎬 [Grok Imagine] Poll response:', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('🎬 [Grok Imagine] Poll error:', response.status, responseText);
      
      // If 202, still processing
      if (response.status === 202) {
        return { duration: 0, status: 'processing', requestId };
      }
      
      return { duration: 0, status: 'failed', error: responseText };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { duration: 0, status: 'failed', error: `Failed to parse poll response: ${responseText}` };
    }

    console.log('🎬 [Grok Imagine] Parsed poll data:', JSON.stringify(data, null, 2).substring(0, 1000));
    
    // Check if still processing
    if (data.status === 'processing' || data.status === 'pending' || data.status === 'queued') {
      console.log('🎬 [Grok Imagine] Still processing, status:', data.status);
      return { duration: 0, status: 'processing', requestId };
    }

    // Check for failure
    if (data.status === 'failed' || data.error) {
      return { duration: 0, status: 'failed', error: data.error || data.message || 'Generation failed' };
    }

    // Success - extract video URL (try multiple possible field names)
    const videoUrl = data.url || data.video_url || data.result?.url || data.video?.url || data.output?.url;
    const duration = data.duration || data.video?.duration || 5;

    if (videoUrl) {
      console.log('🎬 [Grok Imagine] Video ready:', videoUrl);
      return {
        videoUrl,
        duration,
        status: 'completed',
        requestId,
      };
    }

    // Check if status indicates completion but no URL found
    if (data.status === 'completed' || data.status === 'succeeded' || data.status === 'success') {
      console.log('🎬 [Grok Imagine] Status is complete but no URL found in response');
      return { duration: 0, status: 'failed', error: 'Video generation completed but no URL in response', requestId };
    }

    // Still processing if no URL and no completion status
    console.log('🎬 [Grok Imagine] No URL yet, assuming still processing');
    return { duration: 0, status: 'processing', requestId };
  } catch (error) {
    console.error('🎬 [Grok Imagine] Poll error:', error);
    return { duration: 0, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate video with automatic polling (convenience function)
 * @param imageUrl - URL of the image
 * @param config - Video generation configuration
 * @param maxWaitTime - Maximum time to wait in seconds (default: 300)
 * @param pollInterval - Polling interval in seconds (default: 5)
 * @returns Video result when complete
 */
export async function generateGrokVideoWithPolling(
  imageUrl: string,
  config: GrokVideoConfig = {},
  maxWaitTime: number = 300,
  pollInterval: number = 5
): Promise<GrokVideoResult> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitTime * 1000;

  // Start generation
  const startResult = await startGrokVideoGeneration(imageUrl, config);
  
  if ('error' in startResult) {
    return { duration: 0, status: 'failed', error: startResult.error };
  }

  const { requestId } = startResult;

  // Poll until complete
  while (true) {
    // Check timeout
    if (Date.now() - startTime > maxWaitMs) {
      return { duration: 0, status: 'failed', error: 'Video generation timeout', requestId };
    }

    // Wait before polling
    await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));

    // Poll for status
    const result = await pollGrokVideoResult(requestId);
    
    if (result.status !== 'processing') {
      return result;
    }
    
    console.log('🎬 [Grok Imagine] Still processing...');
  }
}
