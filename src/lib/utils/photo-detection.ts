/**
 * Photo detection utilities using Gemini Vision API
 */

export interface PhotoDetectionResult {
  hasPhoto: boolean;
  allCornersVisible: boolean;
}

/**
 * Check if a photo is visible in the frame with all 4 corners visible
 */
export async function checkPhotoInFrame(frameData: string): Promise<PhotoDetectionResult> {
  try {
    const base64Data = frameData.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await fetch('/api/analyze-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Data,
        mimeType: 'image/jpeg',
        prompt: 'Look at this camera frame. Is there a physical photograph, printed photo, or document visible? Are ALL FOUR CORNERS of the photo clearly visible and not cut off? Answer in this exact format: PHOTO:YES/NO CORNERS:YES/NO (e.g., "PHOTO:YES CORNERS:YES" or "PHOTO:YES CORNERS:NO").',
      }),
    });

    const data = await response.json();
    const answer = data.response?.toUpperCase().trim() || '';
    
    // Parse the response
    const hasPhoto = answer.includes('PHOTO:YES');
    const allCornersVisible = answer.includes('CORNERS:YES');
    
    return { hasPhoto, allCornersVisible };
  } catch (error) {
    console.error('Error checking photo in frame:', error);
    return { hasPhoto: false, allCornersVisible: false };
  }
}
