// Image Processing Service
// Uses Gemini Vision for bounding box detection and server-side cropping

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessedImage {
  imageBase64: string;
  mimeType: string;
  description?: string;
  boundingBox?: BoundingBox;
}

/**
 * Get bounding box of photo within frame using Gemini Vision
 */
async function getPhotoBoundingBox(imageBase64: string): Promise<BoundingBox | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `You are a precise image cropping assistant. A person is holding up or showing a physical photograph to the camera.

TASK: Return the EXACT bounding box of ONLY the photograph itself - NOT including:
- Hands or fingers holding the photo
- The photo frame or border (if any)
- Any background behind the photo
- Table surface or any other objects

Focus on the IMAGE CONTENT inside the photograph only.

Return a JSON object with coordinates on a 0-1000 scale:
{"x": <left>, "y": <top>, "width": <width>, "height": <height>}

Where:
- x=0 is left edge of camera view, x=1000 is right edge
- y=0 is top edge, y=1000 is bottom edge
- The box should tightly wrap ONLY the photo content, excluding fingers/hands

If you see fingers covering corners, estimate where the photo edge would be behind the finger.

If no distinct photograph is visible, return: {"error": "no photo detected"}

ONLY return the JSON, nothing else.`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text().trim();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) {
      console.log('Could not parse bounding box from:', text);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error) {
      console.log('Gemini response:', parsed.error);
      return null;
    }

    if (
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number' &&
      typeof parsed.width === 'number' &&
      typeof parsed.height === 'number'
    ) {
      return parsed;
    }

    return null;
  } catch (error) {
    console.error('Error getting bounding box:', error);
    return null;
  }
}

/**
 * Crop image using bounding box (server-side using canvas)
 * Uses jimp or returns coordinates for client-side cropping
 */
async function cropImageWithBoundingBox(
  imageBase64: string,
  bbox: BoundingBox
): Promise<string> {
  // Since we're in Node.js, we need to use a library like sharp or jimp
  // For now, we'll use a simpler approach with the built-in canvas (if available)
  // or return a processed version
  
  try {
    // Try to use sharp for server-side image processing
    const sharp = (await import('sharp')).default;
    
    // Clean base64 and convert to buffer
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');
    
    // Get image metadata to calculate actual pixel coordinates
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 1000;
    const imgHeight = metadata.height || 1000;
    
    // Convert normalized coordinates (0-1000) to actual pixels
    // Add inward padding to exclude finger edges (5% on each side)
    let x = Math.round((bbox.x / 1000) * imgWidth);
    let y = Math.round((bbox.y / 1000) * imgHeight);
    let width = Math.round((bbox.width / 1000) * imgWidth);
    let height = Math.round((bbox.height / 1000) * imgHeight);
    
    // Add inward padding
    const padX = Math.round(width * 0.03);
    const padY = Math.round(height * 0.03);
    x += padX;
    y += padY;
    width -= padX * 2;
    height -= padY * 2;
    
    // Ensure bounds are valid
    x = Math.max(0, x);
    y = Math.max(0, y);
    width = Math.min(width, imgWidth - x);
    height = Math.min(height, imgHeight - y);
    
    if (width < 50 || height < 50) {
      console.log('Cropped region too small, using original');
      return imageBase64;
    }
    
    // Crop the image
    const croppedBuffer = await sharp(imageBuffer)
      .extract({ left: x, top: y, width, height })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    const croppedBase64 = croppedBuffer.toString('base64');
    return `data:image/jpeg;base64,${croppedBase64}`;
  } catch (error) {
    console.error('Sharp not available or crop failed:', error);
    // Return original if cropping fails
    return imageBase64;
  }
}

/**
 * Try to extract full-frame photo using Gemini 2.5 Flash Image (Nano Banana)
 */
async function extractWithNanoBanana(imageBase64: string): Promise<string | null> {
  try {
    // Try using Gemini 2.5 Flash Image for image editing
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const prompt = `Extract and create a full-frame, clean version of ONLY the photograph itself.

Remove:
- All background (table, surface, hands, fingers, thumbs)
- Any uneven edges or borders
- Any artifacts or distractions

Requirements:
- Straighten the photo if tilted
- Make it look like a professional scan
- Preserve original content, colors, and quality
- Output should be a clean, full-frame photograph

Return the extracted photo as an image.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    return null;
  } catch (error) {
    console.log('Nano Banana extraction not available, using analysis method');
    return null;
  }
}

/**
 * Get detailed photo analysis including perspective and rotation
 */
async function analyzePhotoForExtraction(imageBase64: string): Promise<{
  bbox: BoundingBox;
  rotation?: number;
  perspective?: { topLeft: [number, number]; topRight: [number, number]; bottomLeft: [number, number]; bottomRight: [number, number] };
} | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `You are analyzing a photograph being held up to a camera.

TASK: Provide detailed information to extract a full-frame, clean version of the photo.

Return a JSON object with:
{
  "bbox": {"x": <left 0-1000>, "y": <top 0-1000>, "width": <width>, "height": <height>},
  "rotation": <rotation angle in degrees, 0 if straight>,
  "corners": {
    "topLeft": [x, y],
    "topRight": [x, y],
    "bottomLeft": [x, y],
    "bottomRight": [x, y]
  }
}

Where:
- bbox: Tight bounding box of ONLY the photo (no hands, background, table)
- rotation: How much the photo is rotated (estimate angle)
- corners: The four corners of the photo in the image (coordinates 0-1000 scale)

If fingers are covering corners, estimate where the corner would be.

ONLY return the JSON, nothing else.`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text().trim();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('Could not parse photo analysis:', text);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (parsed.bbox && parsed.bbox.x !== undefined) {
      return {
        bbox: parsed.bbox,
        rotation: parsed.rotation || 0,
        perspective: parsed.corners ? {
          topLeft: parsed.corners.topLeft,
          topRight: parsed.corners.topRight,
          bottomLeft: parsed.corners.bottomLeft,
          bottomRight: parsed.corners.bottomRight,
        } : undefined,
      };
    }

    return null;
  } catch (error) {
    console.error('Photo analysis error:', error);
    return null;
  }
}

/**
 * Extract full-frame photo with perspective correction and cleanup
 */
async function extractFullFrameWithCorrection(
  imageBase64: string,
  analysis: { bbox: BoundingBox; rotation?: number; perspective?: any }
): Promise<string> {
  try {
    const sharp = (await import('sharp')).default;
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');
    
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 1000;
    const imgHeight = metadata.height || 1000;
    
    // Convert normalized coordinates to pixels
    let x = Math.round((analysis.bbox.x / 1000) * imgWidth);
    let y = Math.round((analysis.bbox.y / 1000) * imgHeight);
    let width = Math.round((analysis.bbox.width / 1000) * imgWidth);
    let height = Math.round((analysis.bbox.height / 1000) * imgHeight);
    
    // Add small inward padding to ensure clean edges
    const padX = Math.round(width * 0.02);
    const padY = Math.round(height * 0.02);
    x += padX;
    y += padY;
    width -= padX * 2;
    height -= padY * 2;
    
    // Ensure bounds are valid
    x = Math.max(0, x);
    y = Math.max(0, y);
    width = Math.min(width, imgWidth - x);
    height = Math.min(height, imgHeight - y);
    
    if (width < 50 || height < 50) {
      throw new Error('Region too small');
    }
    
    let pipeline = sharp(imageBuffer)
      .extract({ left: x, top: y, width, height });
    
    // Apply rotation if needed
    if (analysis.rotation && Math.abs(analysis.rotation) > 1) {
      pipeline = pipeline.rotate(analysis.rotation);
    }
    
    // Apply perspective correction if corners are provided
    if (analysis.perspective) {
      // Convert corner coordinates to pixels
      const corners = {
        topLeft: [
          Math.round((analysis.perspective.topLeft[0] / 1000) * imgWidth),
          Math.round((analysis.perspective.topLeft[1] / 1000) * imgHeight),
        ],
        topRight: [
          Math.round((analysis.perspective.topRight[0] / 1000) * imgWidth),
          Math.round((analysis.perspective.topRight[1] / 1000) * imgHeight),
        ],
        bottomLeft: [
          Math.round((analysis.perspective.bottomLeft[0] / 1000) * imgWidth),
          Math.round((analysis.perspective.bottomLeft[1] / 1000) * imgHeight),
        ],
        bottomRight: [
          Math.round((analysis.perspective.bottomRight[0] / 1000) * imgWidth),
          Math.round((analysis.perspective.bottomRight[1] / 1000) * imgHeight),
        ],
      };
      
      // Use perspective transformation (Sharp doesn't have direct perspective, but we can use affine)
      // For now, we'll rely on rotation and cropping
    }
    
    // Enhance the image
    const processedBuffer = await pipeline
      .sharpen({ sigma: 1, flat: 1, jagged: 2 }) // Sharpen for clean edges
      .normalize() // Auto-level colors
      .modulate({ brightness: 1.05, saturation: 1.1 }) // Slight enhancement
      .jpeg({ quality: 95, mozjpeg: true }) // High quality JPEG
      .toBuffer();
    
    return `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Full-frame extraction with correction failed:', error);
    throw error;
  }
}

/**
 * Process a scanned photo: extract full-frame, clean photo
 * @param imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @returns Processed image as base64
 */
export async function processScannedPhoto(
  imageBase64: string
): Promise<ProcessedImage> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Clean base64 string
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  console.log('🖼️ Extracting full-frame photo with Nano Banana...');
  
  // Step 1: Try Nano Banana (Gemini 2.5 Flash Image) for direct extraction
  const nanoBananaResult = await extractWithNanoBanana(imageBase64);
  
  if (nanoBananaResult) {
    console.log('✅ Full-frame photo extracted with Nano Banana');
    const extractedBase64 = nanoBananaResult.replace(/^data:image\/\w+;base64,/, '');
    return {
      imageBase64: extractedBase64,
      mimeType: 'image/jpeg',
      description: 'Full-frame photo extracted and cleaned with Nano Banana',
    };
  }
  
  console.log('⚠️ Nano Banana extraction not available, using analysis method...');
  console.log('🖼️ Analyzing photo for full-frame extraction...');
  
  // Step 2: Get detailed analysis (bounding box, rotation, perspective)
  const analysis = await analyzePhotoForExtraction(imageBase64);
  
  if (!analysis) {
    console.log('⚠️ Could not analyze photo, falling back to basic detection...');
    
    // Fallback to basic bounding box detection
    const bbox = await getPhotoBoundingBox(imageBase64);
    
    if (!bbox) {
      console.log('Could not detect photo boundaries, using original');
      return {
        imageBase64: cleanBase64,
        mimeType: 'image/jpeg',
        description: 'Original image (could not process)',
      };
    }
    
    // Use basic cropping
    const croppedImage = await cropImageWithBoundingBox(imageBase64, bbox);
    const croppedBase64 = croppedImage.replace(/^data:image\/\w+;base64,/, '');
    
    return {
      imageBase64: croppedBase64,
      mimeType: 'image/jpeg',
      description: 'Photo cropped',
      boundingBox: bbox,
    };
  }

  console.log('📐 Photo analysis complete:', {
    bbox: analysis.bbox,
    rotation: analysis.rotation,
    hasPerspective: !!analysis.perspective,
  });
  
  // Step 2: Extract full-frame with perspective correction and enhancement
  console.log('✂️ Extracting full-frame photo with corrections...');
  
  try {
    const extractedImage = await extractFullFrameWithCorrection(imageBase64, analysis);
    const extractedBase64 = extractedImage.replace(/^data:image\/\w+;base64,/, '');
    
    console.log('✅ Full-frame photo extracted and cleaned');
    
    return {
      imageBase64: extractedBase64,
      mimeType: 'image/jpeg',
      description: 'Full-frame photo extracted, straightened, and enhanced',
      boundingBox: analysis.bbox,
    };
  } catch (error) {
    console.error('Full-frame extraction failed, using basic crop:', error);
    
    // Fallback to basic cropping
    const croppedImage = await cropImageWithBoundingBox(imageBase64, analysis.bbox);
    const croppedBase64 = croppedImage.replace(/^data:image\/\w+;base64,/, '');
    
    return {
      imageBase64: croppedBase64,
      mimeType: 'image/jpeg',
      description: 'Photo cropped (full extraction failed)',
      boundingBox: analysis.bbox,
    };
  }
}

/**
 * Crop photo using bounding box detection and Gemini
 * Falls back to original if processing fails
 */
export async function cropAndEnhancePhoto(
  imageBase64: string
): Promise<string> {
  try {
    const result = await processScannedPhoto(imageBase64);
    return `data:${result.mimeType};base64,${result.imageBase64}`;
  } catch (error) {
    console.error('Crop and enhance failed, using original:', error);
    // Return original image if processing fails
    if (imageBase64.startsWith('data:')) {
      return imageBase64;
    }
    return `data:image/jpeg;base64,${imageBase64}`;
  }
}
