/**
 * Custom hook for photo scanning functionality
 */

import { useState, useRef, useCallback } from 'react';
import { extractPhotoWithGemini, captureFullFrame } from '@/lib/photo-scanner';
import { computeImageHash } from '@/lib/utils/image-utils';
import { checkPhotoInFrame } from '@/lib/utils/photo-detection';
import { detectMotion } from '@/lib/utils/image-utils';

interface ScannedPhoto {
  id: string;
  imageData: string;
  timestamp: number;
  description?: string;
}

interface UsePhotoScannerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentFrameRef: React.RefObject<string | null>;
  onToast: (message: string) => void;
}

export function usePhotoScanner({ videoRef, currentFrameRef, onToast }: UsePhotoScannerOptions) {
  const [scannedPhotos, setScannedPhotos] = useState<ScannedPhoto[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [photoDetected, setPhotoDetected] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  
  const lastCaptureTimeRef = useRef<number>(0);
  const capturedPhotoHashesRef = useRef<Set<string>>(new Set());
  const scanningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scanningAttemptsRef = useRef<number>(0);
  const previousFrameRef = useRef<string | null>(null);
  const stillFrameCountRef = useRef<number>(0);
  const requiredStillFrames = 1;

  const stopScanning = useCallback(() => {
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
      scanningIntervalRef.current = null;
    }
    setIsScanning(false);
    setPhotoDetected(false);
    setScanStatus('');
    scanningAttemptsRef.current = 0;
    previousFrameRef.current = null;
    stillFrameCountRef.current = 0;
  }, []);

  const capturePhoto = useCallback(async (description?: string) => {
    // Always stop scanner when capturing - never auto-restart
    stopScanning();
    
    const now = Date.now();
    if (now - lastCaptureTimeRef.current < 3000) {
      console.log('Capture debounced');
      return;
    }
    lastCaptureTimeRef.current = now;

    onToast('🔍 Finding the photo...');
    
    let frame: string | null = null;
    
    // Try Gemini-powered extraction first
    if (videoRef.current) {
      try {
        frame = await extractPhotoWithGemini(videoRef.current);
      } catch (error) {
        console.log('Gemini extraction failed:', error);
      }
    }
    
    // Fallback: Capture full frame
    if (!frame && videoRef.current) {
      frame = captureFullFrame(videoRef.current);
    }
    
    // Fallback: Use cached frame
    if (!frame) {
      frame = currentFrameRef.current || null;
    }
    
    if (!frame) {
      onToast('⚠️ Camera not ready - try again');
      return;
    }
    
    // Check for duplicate
    const hash = computeImageHash(frame);
    if (capturedPhotoHashesRef.current.has(hash)) {
      onToast('📷 Photo already captured!');
      return;
    }
    capturedPhotoHashesRef.current.add(hash);
    
    const newPhoto: ScannedPhoto = {
      id: `photo-${now}`,
      imageData: frame,
      timestamp: now,
      description,
    };

    onToast('📸 Photo saved!');
    setScannedPhotos(prev => [newPhoto, ...prev].slice(0, 20));
  }, [videoRef, currentFrameRef, onToast, stopScanning]);

  const startScanning = useCallback(() => {
    if (!videoRef.current || !currentFrameRef.current || isScanning) return;
    
    setIsScanning(true);
    setPhotoDetected(false);
    setScanStatus('🔍 Looking for photo...');
    scanningAttemptsRef.current = 0;
    previousFrameRef.current = null;
    stillFrameCountRef.current = 0;
    onToast('🔍 Scanning for photo... Position photo in frame');
    
    scanningIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !currentFrameRef.current) return;
      
      scanningAttemptsRef.current++;
      
      if (scanningAttemptsRef.current > 30) {
        stopScanning();
        onToast('⏱️ Scan timeout - try again');
        return;
      }
      
      // Check for motion
      const { hasMotion, newPreviousFrame } = detectMotion(
        currentFrameRef.current,
        previousFrameRef.current
      );
      previousFrameRef.current = newPreviousFrame;
      
      if (hasMotion) {
        stillFrameCountRef.current = 0;
        setPhotoDetected(false);
        setScanStatus('📷 Hold steady...');
        return;
      }
      
      // Check photo
      const { hasPhoto, allCornersVisible } = await checkPhotoInFrame(currentFrameRef.current);
      
      if (hasPhoto && allCornersVisible) {
        stillFrameCountRef.current++;
        
        if (stillFrameCountRef.current >= requiredStillFrames) {
          setPhotoDetected(true);
          setScanStatus('📷 Hold still - capturing now!');
          setTimeout(async () => {
            stopScanning();
            await capturePhoto('Auto-detected photo');
          }, 500);
        } else {
          setPhotoDetected(true);
          setScanStatus('✅ All corners visible!');
        }
      } else if (hasPhoto && !allCornersVisible) {
        setPhotoDetected(false);
        setScanStatus('⚠️ Show all 4 corners');
      } else {
        setPhotoDetected(false);
        stillFrameCountRef.current = 0;
        setScanStatus('🔍 Looking for photo...');
      }
    }, 800);
  }, [videoRef, currentFrameRef, isScanning, onToast, capturePhoto, stopScanning]);

  // Remove a photo from scannedPhotos (for delete/retake)
  const removePhoto = useCallback((photoId: string) => {
    setScannedPhotos(prev => prev.filter(p => p.id !== photoId));
  }, []);

  // Clear all captured hashes (allows recapturing same photos)
  const clearHashes = useCallback(() => {
    capturedPhotoHashesRef.current.clear();
  }, []);

  return {
    scannedPhotos,
    isScanning,
    photoDetected,
    scanStatus,
    capturePhoto,
    startScanning,
    stopScanning,
    removePhoto,
    clearHashes,
  };
}
