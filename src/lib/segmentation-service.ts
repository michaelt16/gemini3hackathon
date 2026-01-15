/**
 * Real-time Segmentation Service using MediaPipe
 * Creates pixel-perfect outlines around people/objects
 */

// MediaPipe doesn't have proper ES module exports, we need to load it from CDN
// and use a different approach

export interface SegmentationResult {
  mask: ImageData | null;
  width: number;
  height: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SelfieSegmentation: any = null;
let segmenter: InstanceType<typeof SelfieSegmentation> | null = null;
let isInitializing = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let latestResult: any = null;

/**
 * Load MediaPipe Selfie Segmentation from CDN
 */
async function loadMediaPipe(): Promise<void> {
  if (SelfieSegmentation) return;
  
  // Check if already loaded globally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).SelfieSegmentation) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SelfieSegmentation = (window as any).SelfieSegmentation;
    return;
  }
  
  // Load the script from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SelfieSegmentation = (window as any).SelfieSegmentation;
      if (SelfieSegmentation) {
        resolve();
      } else {
        reject(new Error('SelfieSegmentation not found after script load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load MediaPipe script'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize the MediaPipe Selfie Segmentation model
 */
export async function initSegmentation(): Promise<void> {
  if (segmenter) return;
  
  if (isInitializing) {
    // Wait for existing initialization
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }
  
  isInitializing = true;
  console.log('🎭 Loading MediaPipe Selfie Segmentation...');
  
  try {
    await loadMediaPipe();
    
    segmenter = new SelfieSegmentation({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      },
    });
    
    segmenter.setOptions({
      modelSelection: 1, // 1 = landscape model (better for general use)
      selfieMode: false, // false = not mirrored
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    segmenter.onResults((results: any) => {
      latestResult = results;
    });
    
    // Initialize the model by sending a dummy frame
    await segmenter.initialize?.();
    
    console.log('✅ MediaPipe Selfie Segmentation ready!');
  } catch (error) {
    console.error('Failed to initialize segmentation:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Process a video frame and get segmentation mask
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function segmentFrame(video: HTMLVideoElement): Promise<any> {
  if (!segmenter) {
    await initSegmentation();
  }
  
  if (!segmenter || !video || video.videoWidth === 0) {
    return null;
  }
  
  try {
    await segmenter.send({ image: video });
    return latestResult;
  } catch (error) {
    console.error('Segmentation error:', error);
    return null;
  }
}

/**
 * Segmentation Tracker - continuous real-time segmentation
 */
export class SegmentationTracker {
  private video: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onUpdate: ((result: any) => void) | null = null;
  private frameCount = 0;
  private frameSkip = 2; // Process every Nth frame
  
  /**
   * Start segmentation tracking
   */
  async start(
    video: HTMLVideoElement,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdate: (result: any) => void
  ): Promise<void> {
    this.video = video;
    this.onUpdate = onUpdate;
    this.isRunning = true;
    
    // Pre-load the model
    await initSegmentation();
    
    // Start the loop
    this.processLoop();
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
    this.onUpdate?.(null);
  }
  
  /**
   * Main processing loop
   */
  private processLoop = async (): Promise<void> => {
    if (!this.isRunning || !this.video) return;
    
    this.frameCount++;
    
    // Only process every N frames for performance
    if (this.frameCount % this.frameSkip === 0) {
      const result = await segmentFrame(this.video);
      this.onUpdate?.(result);
    }
    
    this.animationFrameId = requestAnimationFrame(this.processLoop);
  };
}

// Export a type for the results (matches MediaPipe structure)
export interface Results {
  segmentationMask: HTMLCanvasElement;
  image: HTMLVideoElement;
}
