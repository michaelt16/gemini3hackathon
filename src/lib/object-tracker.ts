/**
 * Real-time Object Tracking using TensorFlow.js + COCO-SSD
 * Provides smooth, 30 FPS object detection in the browser
 */

import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  x: number;      // percentage 0-100
  y: number;
  width: number;
  height: number;
  color: string;
}

// Color palette for different object types
const OBJECT_COLORS: Record<string, string> = {
  person: '#FF6B6B',
  book: '#4ECDC4',
  cell_phone: '#45B7D1',
  laptop: '#96CEB4',
  tv: '#FFEAA7',
  chair: '#DDA0DD',
  couch: '#98D8C8',
  dining_table: '#F7DC6F',
  default: '#74B9FF',
};

let model: cocoSsd.ObjectDetection | null = null;
let isLoading = false;

/**
 * Load the COCO-SSD model (lazy loading)
 */
export async function loadModel(): Promise<cocoSsd.ObjectDetection> {
  if (model) return model;
  
  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return model!;
  }
  
  isLoading = true;
  console.log('🔄 Loading COCO-SSD model...');
  
  try {
    model = await cocoSsd.load({
      base: 'lite_mobilenet_v2', // Faster, lighter model for real-time
    });
    console.log('✅ COCO-SSD model loaded!');
    return model;
  } finally {
    isLoading = false;
  }
}

/**
 * Detect objects in a video frame
 */
export async function detectObjects(
  video: HTMLVideoElement,
  minConfidence: number = 0.5
): Promise<DetectedObject[]> {
  if (!model) {
    await loadModel();
  }
  
  if (!model || !video || video.videoWidth === 0) {
    return [];
  }
  
  try {
    const predictions = await model.detect(video);
    
    // Convert to our format with percentage coordinates
    const objects: DetectedObject[] = predictions
      .filter(pred => pred.score >= minConfidence)
      .map((pred, index) => ({
        id: `${pred.class}-${index}`,
        label: pred.class.replace('_', ' '),
        confidence: pred.score,
        x: (pred.bbox[0] / video.videoWidth) * 100,
        y: (pred.bbox[1] / video.videoHeight) * 100,
        width: (pred.bbox[2] / video.videoWidth) * 100,
        height: (pred.bbox[3] / video.videoHeight) * 100,
        color: OBJECT_COLORS[pred.class] || OBJECT_COLORS.default,
      }));
    
    return objects;
  } catch (error) {
    console.error('Detection error:', error);
    return [];
  }
}

/**
 * Object Tracker class for continuous real-time tracking
 */
export class ObjectTracker {
  private video: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private lastDetection: DetectedObject[] = [];
  private onUpdate: ((objects: DetectedObject[]) => void) | null = null;
  private isRunning = false;
  private frameSkip = 2; // Process every Nth frame for performance
  private frameCount = 0;
  
  /**
   * Start tracking objects in a video element
   */
  async start(
    video: HTMLVideoElement,
    onUpdate: (objects: DetectedObject[]) => void
  ): Promise<void> {
    this.video = video;
    this.onUpdate = onUpdate;
    this.isRunning = true;
    
    // Pre-load the model
    await loadModel();
    
    // Start the detection loop
    this.detectLoop();
  }
  
  /**
   * Stop tracking
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastDetection = [];
    this.onUpdate?.([]);
  }
  
  /**
   * Main detection loop - runs at screen refresh rate
   */
  private detectLoop = async (): Promise<void> => {
    if (!this.isRunning || !this.video) return;
    
    this.frameCount++;
    
    // Only run detection every N frames for performance
    if (this.frameCount % this.frameSkip === 0) {
      const objects = await detectObjects(this.video, 0.4);
      
      // Smooth the detections (interpolate positions)
      const smoothed = this.smoothDetections(objects);
      this.lastDetection = smoothed;
      this.onUpdate?.(smoothed);
    }
    
    // Continue the loop
    this.animationFrameId = requestAnimationFrame(this.detectLoop);
  };
  
  /**
   * Smooth detections by interpolating with previous frame
   */
  private smoothDetections(current: DetectedObject[]): DetectedObject[] {
    if (this.lastDetection.length === 0) return current;
    
    // Match current objects to previous ones by label and proximity
    return current.map(obj => {
      const prev = this.lastDetection.find(p => 
        p.label === obj.label &&
        Math.abs(p.x - obj.x) < 20 &&
        Math.abs(p.y - obj.y) < 20
      );
      
      if (prev) {
        // Interpolate for smoother movement (lerp)
        const lerp = 0.3; // 30% toward new position per frame
        return {
          ...obj,
          x: prev.x + (obj.x - prev.x) * lerp,
          y: prev.y + (obj.y - prev.y) * lerp,
          width: prev.width + (obj.width - prev.width) * lerp,
          height: prev.height + (obj.height - prev.height) * lerp,
        };
      }
      
      return obj;
    });
  }
  
  /**
   * Get current detections
   */
  getDetections(): DetectedObject[] {
    return this.lastDetection;
  }
}

// Singleton tracker instance
let trackerInstance: ObjectTracker | null = null;

export function getTracker(): ObjectTracker {
  if (!trackerInstance) {
    trackerInstance = new ObjectTracker();
  }
  return trackerInstance;
}
