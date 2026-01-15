// Face detection and recognition service using face-api.js
import * as faceapi from 'face-api.js';

let modelsLoaded = false;

// Load face-api.js models
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  
  const MODEL_URL = '/models';
  
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  
  modelsLoaded = true;
  console.log('Face recognition models loaded');
}

// Detected face with embedding
export interface DetectedFace {
  // Bounding box (for UI display)
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Face descriptor (128-dimensional embedding)
  descriptor: Float32Array;
  // Confidence score
  confidence: number;
}

// Detect all faces in an image and get their embeddings
export async function detectFaces(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null): Promise<DetectedFace[]> {
  if (!imageElement) {
    console.warn('detectFaces: No image element provided');
    return [];
  }
  
  // Validate the element is a valid media type
  if (!(imageElement instanceof HTMLImageElement) && 
      !(imageElement instanceof HTMLVideoElement) && 
      !(imageElement instanceof HTMLCanvasElement)) {
    console.warn('detectFaces: Invalid element type', imageElement);
    return [];
  }
  
  // For images, ensure they're loaded
  if (imageElement instanceof HTMLImageElement) {
    if (!imageElement.complete || imageElement.naturalWidth === 0) {
      console.warn('detectFaces: Image not fully loaded');
      return [];
    }
  }
  
  if (!modelsLoaded) {
    await loadFaceModels();
  }
  
  // Use lower minConfidence and smaller minFaceSize to detect more faces
  // including babies and partially visible faces
  const options = new faceapi.SsdMobilenetv1Options({ 
    minConfidence: 0.3,  // Lower threshold (default is 0.5)
    maxResults: 10,      // Allow more faces
  });
  
  try {
    const detections = await faceapi
      .detectAllFaces(imageElement, options)
      .withFaceLandmarks()
      .withFaceDescriptors();
  
    return detections.map(detection => ({
      box: {
        x: detection.detection.box.x,
        y: detection.detection.box.y,
        width: detection.detection.box.width,
        height: detection.detection.box.height,
      },
      descriptor: detection.descriptor,
      confidence: detection.detection.score,
    }));
  } catch (error) {
    console.error('Face detection failed:', error);
    return [];
  }
}

// Calculate Euclidean distance between two face descriptors
export function calculateDistance(descriptor1: Float32Array, descriptor2: Float32Array): number {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
}

// Match a face against known faces
export interface FaceMatch {
  characterId: string;
  characterName: string;
  distance: number;
  confidence: number; // 0-100%
}

// Thresholds for face matching
const CONFIDENT_MATCH_THRESHOLD = 0.45; // High confidence - definitely the same person
const POSSIBLE_MATCH_THRESHOLD = 0.6;   // Low confidence - might be the same person

export function matchFace(
  faceDescriptor: Float32Array,
  knownFaces: { characterId: string; characterName: string; descriptor: number[] }[]
): FaceMatch | null {
  if (knownFaces.length === 0) return null;
  
  let bestMatch: FaceMatch | null = null;
  let bestDistance = Infinity;
  
  for (const known of knownFaces) {
    const knownDescriptor = new Float32Array(known.descriptor);
    const distance = calculateDistance(faceDescriptor, knownDescriptor);
    
    // Only consider confident matches (below 0.45 distance)
    // This prevents false positives like "Roberto (23%)"
    if (distance < bestDistance && distance < CONFIDENT_MATCH_THRESHOLD) {
      bestDistance = distance;
      // Convert distance to confidence percentage
      const confidence = Math.round((1 - distance / CONFIDENT_MATCH_THRESHOLD) * 100);
      bestMatch = {
        characterId: known.characterId,
        characterName: known.characterName,
        distance,
        confidence: Math.max(50, Math.min(100, confidence)), // Minimum 50% for display
      };
    }
  }
  
  return bestMatch;
}

// Get possible matches (lower confidence) for suggestions
export function getPossibleMatches(
  faceDescriptor: Float32Array,
  knownFaces: { characterId: string; characterName: string; descriptor: number[] }[]
): FaceMatch[] {
  const matches: FaceMatch[] = [];
  
  for (const known of knownFaces) {
    const knownDescriptor = new Float32Array(known.descriptor);
    const distance = calculateDistance(faceDescriptor, knownDescriptor);
    
    // Between confident and possible threshold = suggest as possible match
    if (distance >= CONFIDENT_MATCH_THRESHOLD && distance < POSSIBLE_MATCH_THRESHOLD) {
      const confidence = Math.round((1 - distance / POSSIBLE_MATCH_THRESHOLD) * 100);
      matches.push({
        characterId: known.characterId,
        characterName: known.characterName,
        distance,
        confidence: Math.max(0, Math.min(49, confidence)), // Max 49% for possible matches
      });
    }
  }
  
  return matches.sort((a, b) => b.confidence - a.confidence);
}

// Convert Float32Array to regular array for storage
export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

// Convert stored array back to Float32Array
export function arrayToDescriptor(array: number[]): Float32Array {
  return new Float32Array(array);
}
