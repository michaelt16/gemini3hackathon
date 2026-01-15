/**
 * Photo Scanner - Extracts photos from camera frames
 * Uses Gemini Vision to detect photo boundaries
 */

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Ask Gemini to identify the photo location in the frame
 * Returns bounding box coordinates
 */
export async function getPhotoBoundingBox(
  frameDataUrl: string
): Promise<BoundingBox | null> {
  try {
    const response = await fetch('/api/analyze-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: frameDataUrl,
        prompt: `You are a precise image cropping assistant. A person is holding up a physical photograph to show to the camera.

TASK: Return the EXACT bounding box of ONLY the photograph itself - NOT including:
- Hands or fingers holding the photo
- The photo frame or border (if any)
- Any background behind the photo

Focus on the IMAGE CONTENT inside the photograph only.

Return a JSON object with coordinates on a 0-1000 scale:
{"x": <left>, "y": <top>, "width": <width>, "height": <height>}

Where:
- x=0 is left edge of camera view, x=1000 is right edge
- y=0 is top edge, y=1000 is bottom edge
- The box should tightly wrap ONLY the photo content, excluding fingers/hands

If you see fingers covering corners, estimate where the photo edge would be behind the finger.

If no distinct photograph is visible, return: {"error": "no photo detected"}

ONLY return the JSON, nothing else.`
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.log('Gemini could not detect photo:', data.error);
      return null;
    }

    // Parse the response - it should be JSON
    let bbox: BoundingBox;
    
    if (typeof data.response === 'string') {
      // Try to extract JSON from the response
      const jsonMatch = data.response.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error) {
          console.log('Gemini response:', parsed.error);
          return null;
        }
        bbox = parsed;
      } else {
        console.log('Could not parse Gemini response:', data.response);
        return null;
      }
    } else {
      bbox = data.response;
    }

    // Validate the bounding box
    if (
      typeof bbox.x === 'number' &&
      typeof bbox.y === 'number' &&
      typeof bbox.width === 'number' &&
      typeof bbox.height === 'number'
    ) {
      return bbox;
    }

    return null;
  } catch (error) {
    console.error('Error getting bounding box from Gemini:', error);
    return null;
  }
}

/**
 * Extract photo from frame using Gemini-detected bounding box
 */
export async function extractPhotoWithGemini(
  videoElement: HTMLVideoElement
): Promise<string | null> {
  if (!videoElement || videoElement.videoWidth === 0) {
    return null;
  }

  // Capture the current frame
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  ctx.drawImage(videoElement, 0, 0);
  const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);

  // Ask Gemini for the bounding box
  console.log('Asking Gemini for photo bounding box...');
  const bbox = await getPhotoBoundingBox(frameDataUrl);
  
  if (!bbox) {
    console.log('Gemini could not detect photo boundaries');
    return null;
  }

  console.log('Gemini detected photo at:', bbox);

  // Convert normalized coordinates (0-1000) to pixel coordinates
  let x = Math.round((bbox.x / 1000) * canvas.width);
  let y = Math.round((bbox.y / 1000) * canvas.height);
  let width = Math.round((bbox.width / 1000) * canvas.width);
  let height = Math.round((bbox.height / 1000) * canvas.height);

  // Add inward padding to help exclude finger edges (5% on each side)
  const padX = Math.round(width * 0.05);
  const padY = Math.round(height * 0.05);
  x += padX;
  y += padY;
  width -= padX * 2;
  height -= padY * 2;

  // Validate bounds
  if (width < 50 || height < 50) {
    console.log('Detected region too small');
    return null;
  }

  // Create cropped canvas
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = width;
  croppedCanvas.height = height;
  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) return null;

  // Draw the cropped region
  croppedCtx.drawImage(
    canvas,
    x, y, width, height,
    0, 0, width, height
  );

  return croppedCanvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Simple center crop fallback
 */
export function cropCenter(
  videoElement: HTMLVideoElement,
  cropRatio: number = 0.7
): string | null {
  if (!videoElement || videoElement.videoWidth === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const vw = videoElement.videoWidth;
  const vh = videoElement.videoHeight;
  
  const cropWidth = vw * cropRatio;
  const cropHeight = vh * cropRatio;
  const offsetX = (vw - cropWidth) / 2;
  const offsetY = (vh - cropHeight) / 2;
  
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  ctx.drawImage(
    videoElement,
    offsetX, offsetY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );
  
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Capture full frame (no cropping)
 */
export function captureFullFrame(
  videoElement: HTMLVideoElement
): string | null {
  if (!videoElement || videoElement.videoWidth === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  ctx.drawImage(videoElement, 0, 0);
  
  return canvas.toDataURL('image/jpeg', 0.9);
}
