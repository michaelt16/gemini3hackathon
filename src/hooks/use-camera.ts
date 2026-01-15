/**
 * Custom hook for camera management
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseCameraOptions {
  onFrameCapture?: (frame: string) => void;
}

export function useCamera({ onFrameCapture }: UseCameraOptions = {}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentFrameRef = useRef<string | null>(null);
  const videoFrameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState < 2) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0);
    const frameData = canvas.toDataURL('image/jpeg', 0.8);
    return frameData;
  }, []);

  const startVideoFrameCapture = useCallback(() => {
    if (videoFrameIntervalRef.current) return;
    
    videoFrameIntervalRef.current = setInterval(() => {
      const frame = captureFrame();
      if (frame) {
        setCurrentFrame(frame);
        currentFrameRef.current = frame;
        onFrameCapture?.(frame);
      }
    }, 1500);
  }, [captureFrame, onFrameCapture]);

  const stopVideoFrameCapture = useCallback(() => {
    if (videoFrameIntervalRef.current) {
      clearInterval(videoFrameIntervalRef.current);
      videoFrameIntervalRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (cameraActive) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });
      
      streamRef.current = stream;
      setCameraActive(true);
    } catch (error) {
      console.error('Failed to start camera:', error);
      throw error;
    }
  }, [cameraActive]);

  const stopCamera = useCallback(() => {
    stopVideoFrameCapture();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCurrentFrame(null);
    setVideoReady(false);
  }, [stopVideoFrameCapture]);

  // Connect video element to stream when it becomes available
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    
    if (!cameraActive || !video || !stream) {
      return;
    }
    
    // Only set srcObject if it's different to avoid re-triggering
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    
    let mounted = true;
    
    const handleCanPlay = () => {
      if (mounted) {
        console.log('📹 Video can play');
        setVideoReady(true);
        startVideoFrameCapture();
      }
    };
    
    const handlePlaying = () => {
      if (mounted) {
        console.log('📹 Video playing');
        setVideoReady(true);
      }
    };
    
    const handleLoadedData = () => {
      if (mounted) {
        console.log('📹 Video loaded data');
        setVideoReady(true);
        startVideoFrameCapture();
      }
    };
    
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('loadeddata', handleLoadedData);
    
    // Try to play
    video.play().catch((err) => {
      console.warn('Video play failed:', err);
    });
    
    // Check if already ready
    if (video.readyState >= 3) {
      console.log('📹 Video already ready');
      setVideoReady(true);
      startVideoFrameCapture();
    }
    
    return () => {
      mounted = false;
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [cameraActive, startVideoFrameCapture]);

  return {
    cameraActive,
    videoReady,
    currentFrame,
    currentFrameRef,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    captureFrame,
  };
}
