// VEO 3 Video Generation Service
// Converts images to video using Google's VEO 3 API
// Note: VEO 3 may require Vertex AI or special API access

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const VEO_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export interface VeoVideoConfig {
  duration?: 4 | 6 | 8; // seconds
  resolution?: '720p' | '1080p';
  aspectRatio?: '16:9' | '9:16';
  prompt?: string;
}

export interface VeoVideoResult {
  videoUrl?: string;
  videoBase64?: string;
  duration: number;
  status: 'completed' | 'processing' | 'failed';
  operationId?: string;
}

/**
 * Generate video from image using VEO 3
 * @param imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @param config - Video generation configuration
 * @returns Video result with URL or base64 data
 */
export async function generateVideoFromImage(
  imageBase64: string,
  config: VeoVideoConfig = {}
): Promise<VeoVideoResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Clean base64 string (remove data URL prefix if present)
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const {
    duration = 6,
    resolution = '720p',
    aspectRatio = '16:9',
    prompt = 'Create a subtle, minimal animation of this photo. Very slow, gentle movement. Focus on environmental elements like water, leaves, clouds. Like a Live Photo - barely noticeable motion.',
  } = config;

  try {
    // VEO 3 API endpoint (Gemini API format)
    // Uses predictLongRunning for async operations
    const response = await fetch(
      `${VEO_API_BASE_URL}/models/veo-3.1-generate-preview:predictLongRunning?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt,
              image: {
                bytesBase64Encoded: cleanBase64,
                mimeType: 'image/jpeg',
              },
            },
          ],
          parameters: {
            durationSeconds: duration,
            aspectRatio: aspectRatio,
            resolution: resolution,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('VEO 3 API error response:', errorText);
      
      // If 404 or 403, VEO 3 might not be available through this endpoint
      if (response.status === 404 || response.status === 403) {
        throw new Error('VEO 3 API not available. You may need Vertex AI access or the API endpoint may be different. Check Google Cloud Console for VEO 3 availability.');
      }
      
      throw new Error(`VEO 3 API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // VEO 3 returns a long-running operation
    // Check for operation name
    if (data.name) {
      // Async operation - need to poll
      return {
        duration,
        status: 'processing',
        operationId: data.name,
      };
    }

    // If operation is already done (shouldn't happen, but handle it)
    if (data.done && data.response) {
      const video = data.response.generatedSamples?.[0]?.video;
      if (video) {
        return {
          videoUrl: video.uri,
          videoBase64: video.data,
          duration,
          status: 'completed',
        };
      }
    }

    throw new Error('Unexpected response format from VEO 3 API');
  } catch (error) {
    console.error('VEO 3 video generation error:', error);
    throw error;
  }
}

/**
 * Poll for video generation completion
 * @param operationId - Operation ID from initial request
 * @returns Video result when complete
 */
export async function pollVideoGeneration(
  operationId: string
): Promise<VeoVideoResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const response = await fetch(
      `${VEO_API_BASE_URL}/${operationId}?key=${GEMINI_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`VEO 3 polling error: ${error}`);
    }

    const data = await response.json();

    // Check if operation is done
    if (data.done) {
      if (data.error) {
        throw new Error(`VEO 3 generation failed: ${data.error.message || JSON.stringify(data.error)}`);
      }

      // Log the full response to debug
      console.log('VEO 3 polling response:', JSON.stringify(data, null, 2));

      // Try different response formats
      // Format 1: data.response.generateVideoResponse.generatedSamples[0].video (actual VEO 3 format)
      let video = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
      
      // Format 2: data.response.generatedSamples[0].video
      if (!video) {
        video = data.response?.generatedSamples?.[0]?.video;
      }
      
      // Format 3: data.response.predictions[0].video
      if (!video) {
        video = data.response?.predictions?.[0]?.video;
      }
      
      // Format 4: data.response.video
      if (!video) {
        video = data.response?.video;
      }
      
      // Format 5: Direct video in response
      if (!video && data.response) {
        // Check if response itself is the video data
        if (data.response.bytesBase64Encoded || data.response.gcsUri) {
          video = data.response;
        }
      }

      if (video) {
        // Handle different video formats
        let videoUrl = video.gcsUri || video.uri || video.url;
        let videoBase64 = video.bytesBase64Encoded || video.data || video.base64;
        
        console.log('VEO 3 video found:', { videoUrl, hasBase64: !!videoBase64 });
        
        // If we have a URL but no base64, download the video
        if (videoUrl && !videoBase64) {
          try {
            console.log('Downloading video from:', videoUrl);
            
            // Add API key to URL if it's a generativelanguage.googleapis.com URL
            let downloadUrl = videoUrl;
            if (videoUrl.includes('generativelanguage.googleapis.com') && !videoUrl.includes('key=')) {
              const separator = videoUrl.includes('?') ? '&' : '?';
              downloadUrl = `${videoUrl}${separator}key=${GEMINI_API_KEY}`;
            }
            
            const videoResponse = await fetch(downloadUrl, {
              headers: {
                'x-goog-api-key': GEMINI_API_KEY || '',
              },
            });
            
            if (videoResponse.ok) {
              const videoBuffer = await videoResponse.arrayBuffer();
              videoBase64 = Buffer.from(videoBuffer).toString('base64');
              console.log('Video downloaded successfully, size:', videoBuffer.byteLength);
            } else {
              console.error('Failed to download video:', videoResponse.status, await videoResponse.text());
            }
          } catch (downloadError) {
            console.error('Video download error:', downloadError);
          }
        }
        
        if (videoUrl || videoBase64) {
          return {
            videoUrl: videoUrl,
            videoBase64: videoBase64,
            duration: data.response?.generateVideoResponse?.durationSeconds || data.response?.durationSeconds || video.duration || 6,
            status: 'completed',
            operationId,
          };
        }
      }

      // If we get here, log the response structure for debugging
      console.error('Unexpected VEO 3 response structure:', data);
      throw new Error(`Video generation completed but no video in response. Response structure: ${JSON.stringify(data.response || data).substring(0, 500)}`);
    }

    // Still processing
    return {
      duration: 6,
      status: 'processing',
      operationId,
    };
  } catch (error) {
    console.error('VEO 3 polling error:', error);
    throw error;
  }
}

/**
 * Generate video with automatic polling (convenience function)
 * @param imageBase64 - Base64 encoded image
 * @param config - Video generation configuration
 * @param maxWaitTime - Maximum time to wait in seconds (default: 300)
 * @param pollInterval - Polling interval in seconds (default: 5)
 * @returns Video result when complete
 */
export async function generateVideoWithPolling(
  imageBase64: string,
  config: VeoVideoConfig = {},
  maxWaitTime: number = 300,
  pollInterval: number = 5
): Promise<VeoVideoResult> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitTime * 1000;

  // Start generation
  let result = await generateVideoFromImage(imageBase64, config);

  // If immediate completion, return
  if (result.status === 'completed') {
    return result;
  }

  // If failed, return
  if (result.status === 'failed') {
    return result;
  }

  // Poll until complete
  if (!result.operationId) {
    throw new Error('No operation ID returned from VEO 3 API');
  }

  while (result.status === 'processing') {
    // Check timeout
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error('Video generation timeout');
    }

    // Wait before polling
    await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));

    // Poll for status
    result = await pollVideoGeneration(result.operationId);
  }

  return result;
}
