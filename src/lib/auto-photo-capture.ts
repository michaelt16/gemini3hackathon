/**
 * Auto Photo Capture - Reliable photo extraction from camera frames
 * 
 * Uses multiple strategies to ensure clean photo extraction:
 * 1. Gemini image generation (if available)
 * 2. Multi-point corner detection with perspective correction
 * 3. Edge detection with smart cropping
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface PhotoCorners {
  topLeft: [number, number];
  topRight: [number, number];
  bottomLeft: [number, number];
  bottomRight: [number, number];
}

interface PhotoDetectionResult {
  detected: boolean;
  confidence: number;
  corners?: PhotoCorners;
  boundingBox?: { x: number; y: number; width: number; height: number };
  rotation?: number;
  quality?: 'good' | 'partial' | 'poor';
  issues?: string[];
}

interface ExtractedPhoto {
  imageBase64: string;
  quality: 'excellent' | 'good' | 'acceptable';
  method: 'gemini-image' | 'perspective-correct' | 'smart-crop' | 'center-crop';
}

/**
 * Detect photo with very precise corner detection
 * Uses a more specific prompt to get accurate corners
 */
async function detectPhotoCorners(imageBase64: string): Promise<PhotoDetectionResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `You are a precise photo scanner. Analyze this camera image where someone is holding up a physical photograph.

YOUR TASK: Find the EXACT corners of the photograph's content area (not the frame, not hands).

CRITICAL RULES:
1. ONLY detect the actual photo content - NOT fingers, NOT photo frame borders, NOT table
2. If a finger is covering a corner, estimate where the photo edge would be BEHIND the finger
3. Look for the rectangular edge of the printed photo content

Return JSON with coordinates on 0-1000 scale:
{
  "detected": true/false,
  "confidence": 0.0-1.0,
  "corners": {
    "topLeft": [x, y],
    "topRight": [x, y], 
    "bottomLeft": [x, y],
    "bottomRight": [x, y]
  },
  "quality": "good" | "partial" | "poor",
  "issues": ["finger covering corner", "tilted", etc]
}

"good" = all 4 corners clearly visible
"partial" = 1-2 corners obscured but can estimate
"poor" = cannot reliably detect

If no photo visible: {"detected": false, "confidence": 0}

ONLY output JSON.`;

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

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { detected: false, confidence: 0 };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.detected) {
      return { detected: false, confidence: 0 };
    }

    // Calculate bounding box from corners
    if (parsed.corners) {
      const xs = [
        parsed.corners.topLeft[0],
        parsed.corners.topRight[0],
        parsed.corners.bottomLeft[0],
        parsed.corners.bottomRight[0],
      ];
      const ys = [
        parsed.corners.topLeft[1],
        parsed.corners.topRight[1],
        parsed.corners.bottomLeft[1],
        parsed.corners.bottomRight[1],
      ];

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Calculate rotation from top edge
      const topDeltaY = parsed.corners.topRight[1] - parsed.corners.topLeft[1];
      const topDeltaX = parsed.corners.topRight[0] - parsed.corners.topLeft[0];
      const rotation = Math.atan2(topDeltaY, topDeltaX) * (180 / Math.PI);

      return {
        detected: true,
        confidence: parsed.confidence || 0.8,
        corners: parsed.corners,
        boundingBox: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        },
        rotation,
        quality: parsed.quality || 'good',
        issues: parsed.issues || [],
      };
    }

    return { detected: false, confidence: 0 };
  } catch (error) {
    console.error('Photo detection error:', error);
    return { detected: false, confidence: 0 };
  }
}

/**
 * Try to use Gemini's image generation to create a clean extracted photo
 * This is the "Nano Banana" approach - requires responseModalities: ['IMAGE', 'TEXT']
 */
async function extractWithImageGeneration(imageBase64: string): Promise<string | null> {
  console.log('🍌 [auto-capture] Trying Nano Banana extraction...');
  
  try {
    // Use Gemini model with image output capability
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-preview-image-generation',
      generationConfig: {
        // @ts-ignore - responseModalities may not be in types yet
        responseModalities: ['IMAGE', 'TEXT'],
      }
    });

    const prompt = `Extract ONLY the photograph from this image. 

Remove completely:
- All hands, fingers, thumbs
- All background (table, surface, wall)
- Photo frame or borders
- Any reflections or glare

Output ONLY the photograph content as a clean, properly oriented image.
Make it look like a professional digital scan.
Straighten if tilted.
Fill the entire output with just the photo.`;

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

    console.log('🍌 [auto-capture] Response parts:', parts.length, 
      parts.map((p: any) => p.inlineData ? 'image' : (p.text ? 'text' : 'unknown')));

    for (const part of parts) {
      // @ts-ignore - inlineData type
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        console.log('🍌 [auto-capture] ✅ Got image output!');
        // @ts-ignore
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    console.log('🍌 [auto-capture] No image in response');
    return null;
  } catch (error: any) {
    console.log('🍌 [auto-capture] ❌ Nano Banana failed:', error?.message || error);
    return null;
  }
}

/**
 * Extract photo using perspective transformation with Sharp
 */
async function extractWithPerspective(
  imageBase64: string,
  corners: PhotoCorners
): Promise<string | null> {
  try {
    const sharp = (await import('sharp')).default;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 1000;
    const imgHeight = metadata.height || 1000;

    // Convert normalized coordinates to pixels
    const toPixels = (point: [number, number]): [number, number] => [
      Math.round((point[0] / 1000) * imgWidth),
      Math.round((point[1] / 1000) * imgHeight),
    ];

    const tl = toPixels(corners.topLeft);
    const tr = toPixels(corners.topRight);
    const bl = toPixels(corners.bottomLeft);
    const br = toPixels(corners.bottomRight);

    // Calculate output dimensions based on corner distances
    const topWidth = Math.sqrt(Math.pow(tr[0] - tl[0], 2) + Math.pow(tr[1] - tl[1], 2));
    const bottomWidth = Math.sqrt(Math.pow(br[0] - bl[0], 2) + Math.pow(br[1] - bl[1], 2));
    const leftHeight = Math.sqrt(Math.pow(bl[0] - tl[0], 2) + Math.pow(bl[1] - tl[1], 2));
    const rightHeight = Math.sqrt(Math.pow(br[0] - tr[0], 2) + Math.pow(br[1] - tr[1], 2));

    const outputWidth = Math.round(Math.max(topWidth, bottomWidth));
    const outputHeight = Math.round(Math.max(leftHeight, rightHeight));

    if (outputWidth < 50 || outputHeight < 50) {
      return null;
    }

    // For now, use bounding box crop with rotation
    // Full perspective requires more complex matrix transformation
    const minX = Math.min(tl[0], bl[0]);
    const maxX = Math.max(tr[0], br[0]);
    const minY = Math.min(tl[1], tr[1]);
    const maxY = Math.max(bl[1], br[1]);

    // Add small inward padding (3%)
    const padX = Math.round((maxX - minX) * 0.03);
    const padY = Math.round((maxY - minY) * 0.03);

    const x = Math.max(0, minX + padX);
    const y = Math.max(0, minY + padY);
    const width = Math.min(imgWidth - x, maxX - minX - padX * 2);
    const height = Math.min(imgHeight - y, maxY - minY - padY * 2);

    if (width < 50 || height < 50) {
      return null;
    }

    // Calculate rotation from top edge
    const rotation = Math.atan2(tr[1] - tl[1], tr[0] - tl[0]) * (180 / Math.PI);

    let pipeline = sharp(imageBuffer)
      .extract({ left: x, top: y, width, height });

    // Apply rotation if significant
    if (Math.abs(rotation) > 1) {
      pipeline = pipeline.rotate(-rotation, { background: { r: 255, g: 255, b: 255 } });
    }

    // Enhance
    pipeline = pipeline
      .sharpen({ sigma: 0.8 })
      .normalize()
      .jpeg({ quality: 95 });

    const outputBuffer = await pipeline.toBuffer();
    return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Perspective extraction failed:', error);
    return null;
  }
}

/**
 * Smart center crop - crops center portion, good for when photo fills most of frame
 */
async function smartCenterCrop(
  imageBase64: string,
  detection: PhotoDetectionResult
): Promise<string | null> {
  try {
    const sharp = (await import('sharp')).default;

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');

    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 1000;
    const imgHeight = metadata.height || 1000;

    let x: number, y: number, width: number, height: number;

    if (detection.boundingBox) {
      // Use detected bounding box with extra padding
      const bb = detection.boundingBox;
      const padX = Math.round((bb.width / 1000) * imgWidth * 0.05);
      const padY = Math.round((bb.height / 1000) * imgHeight * 0.05);

      x = Math.max(0, Math.round((bb.x / 1000) * imgWidth) + padX);
      y = Math.max(0, Math.round((bb.y / 1000) * imgHeight) + padY);
      width = Math.round((bb.width / 1000) * imgWidth) - padX * 2;
      height = Math.round((bb.height / 1000) * imgHeight) - padY * 2;
    } else {
      // Default to center 60%
      const cropRatio = 0.6;
      width = Math.round(imgWidth * cropRatio);
      height = Math.round(imgHeight * cropRatio);
      x = Math.round((imgWidth - width) / 2);
      y = Math.round((imgHeight - height) / 2);
    }

    // Ensure valid bounds
    x = Math.max(0, Math.min(x, imgWidth - 50));
    y = Math.max(0, Math.min(y, imgHeight - 50));
    width = Math.min(width, imgWidth - x);
    height = Math.min(height, imgHeight - y);

    if (width < 50 || height < 50) {
      return null;
    }

    const outputBuffer = await sharp(imageBuffer)
      .extract({ left: x, top: y, width, height })
      .sharpen({ sigma: 0.5 })
      .jpeg({ quality: 95 })
      .toBuffer();

    return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Smart center crop failed:', error);
    return null;
  }
}

/**
 * Main function: Extract a clean photo from camera frame
 * Tries multiple methods in order of quality
 */
export async function extractCleanPhoto(imageBase64: string): Promise<ExtractedPhoto | null> {
  console.log('🔍 Starting photo extraction...');

  // Step 1: Detect photo corners
  const detection = await detectPhotoCorners(imageBase64);

  if (!detection.detected || detection.confidence < 0.5) {
    console.log('❌ No photo detected in frame');
    return null;
  }

  console.log('✅ Photo detected:', {
    confidence: detection.confidence,
    quality: detection.quality,
    issues: detection.issues,
  });

  // Step 2: Try Gemini image generation (best quality)
  console.log('📸 Trying image generation extraction...');
  const generatedImage = await extractWithImageGeneration(imageBase64);
  if (generatedImage) {
    console.log('✅ Extracted with image generation');
    return {
      imageBase64: generatedImage,
      quality: 'excellent',
      method: 'gemini-image',
    };
  }

  // Step 3: Try perspective-corrected extraction
  if (detection.corners && detection.quality === 'good') {
    console.log('📐 Trying perspective correction...');
    const perspectiveImage = await extractWithPerspective(imageBase64, detection.corners);
    if (perspectiveImage) {
      console.log('✅ Extracted with perspective correction');
      return {
        imageBase64: perspectiveImage,
        quality: 'good',
        method: 'perspective-correct',
      };
    }
  }

  // Step 4: Smart center crop as fallback
  console.log('✂️ Using smart crop fallback...');
  const croppedImage = await smartCenterCrop(imageBase64, detection);
  if (croppedImage) {
    console.log('✅ Extracted with smart crop');
    return {
      imageBase64: croppedImage,
      quality: 'acceptable',
      method: 'smart-crop',
    };
  }

  console.log('❌ All extraction methods failed');
  return null;
}

/**
 * Validate if extracted image looks like a clean photo (no hands, etc.)
 */
export async function validateExtraction(imageBase64: string): Promise<{
  isClean: boolean;
  issues: string[];
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `Analyze this image. Is it a clean, properly cropped photograph?

Check for these issues:
- Visible hands or fingers
- Background visible (table, wall, surface)
- Photo frame/border visible
- Tilted or skewed
- Cut off edges

Return JSON:
{
  "isClean": true/false,
  "issues": ["list of problems found"]
}

A clean photo should look like a professional digital scan with no hands or background.

ONLY output JSON.`;

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

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { isClean: false, issues: ['Could not analyze'] };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    return { isClean: false, issues: ['Analysis failed'] };
  }
}
