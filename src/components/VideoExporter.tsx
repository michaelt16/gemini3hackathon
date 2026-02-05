'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import VideoPlayerWithTime from './VideoPlayerWithTime';

interface Segment {
  photo_id: string;
  order: number;
  text: string;
  audio_url?: string;
  duration?: number;
}

interface Photo {
  id: string;
  original_url: string | null;
  thumbnail_url: string | null;
  animated_url?: string | null;
  animation_type?: string | null;
}

interface VideoExporterProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  segments: Segment[];
  eventId: string;
  eventTitle: string;
  onVideoSaved?: (videoUrl: string) => void;
}

type ExportState = 'idle' | 'loading' | 'recording' | 'processing' | 'done' | 'saving' | 'saved' | 'error';

export default function VideoExporter({
  isOpen,
  onClose,
  photos,
  segments,
  eventId,
  eventTitle,
  onVideoSaved,
}: VideoExporterProps) {
  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [savedVideoUrl, setSavedVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoBlobRef = useRef<Blob | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState('idle');
      setProgress(0);
      setCurrentSegment(0);
      setVideoUrl(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [videoUrl]);

  const getPhotoUrl = useCallback((photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    return photo?.original_url || photo?.thumbnail_url || null;
  }, [photos]);

  const getPhotoAnimation = useCallback((photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    return {
      hasAnimation: !!(photo?.animated_url),
      animatedUrl: photo?.animated_url || null,
      animationType: photo?.animation_type || null,
    };
  }, [photos]);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const loadVideo = (src: string): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true; // Mute to allow autoplay
      video.playsInline = true;
      video.preload = 'auto';
      
      video.onloadeddata = () => resolve(video);
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = src;
      video.load();
    });
  };

  const drawFrameWithKenBurns = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    width: number,
    height: number,
    progressRatio: number,
    animationType: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right'
  ) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Calculate scale to cover canvas (maintain aspect ratio)
    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;
    
    let drawWidth, drawHeight;
    if (imgRatio > canvasRatio) {
      drawHeight = height * 1.2; // Extra for Ken Burns
      drawWidth = drawHeight * imgRatio;
    } else {
      drawWidth = width * 1.2;
      drawHeight = drawWidth / imgRatio;
    }

    // Apply Ken Burns effect
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    switch (animationType) {
      case 'zoom-in':
        scale = 1 + progressRatio * 0.15;
        break;
      case 'zoom-out':
        scale = 1.15 - progressRatio * 0.15;
        break;
      case 'pan-left':
        scale = 1.1;
        offsetX = progressRatio * width * 0.1;
        break;
      case 'pan-right':
        scale = 1.1;
        offsetX = -progressRatio * width * 0.1;
        break;
    }

    const finalWidth = drawWidth * scale;
    const finalHeight = drawHeight * scale;
    const x = (width - finalWidth) / 2 + offsetX;
    const y = (height - finalHeight) / 2 + offsetY;

    ctx.drawImage(img, x, y, finalWidth, finalHeight);
  };

  const drawNarrationText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    width: number,
    height: number
  ) => {
    // Draw gradient background for text
    const gradient = ctx.createLinearGradient(0, height - 150, 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - 150, width, 150);

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Word wrap
    const maxWidth = width - 80;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 32;
    const startY = height - 40 - (lines.length - 1) * lineHeight;
    
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight);
    });
  };

  const generateVideo = useCallback(async () => {
    if (!canvasRef.current || segments.length === 0) return;

    setState('loading');
    setProgress(0);
    chunksRef.current = [];

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setState('error');
      setErrorMessage('Canvas context not available');
      return;
    }

    // Video dimensions (16:9)
    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;

    try {
      // Preload all images and videos
      const images: Map<string, HTMLImageElement> = new Map();
      const videos: Map<string, HTMLVideoElement> = new Map();
      
      for (const segment of segments) {
        const animation = getPhotoAnimation(segment.photo_id);
        
        // Load animated video if available
        if (animation.hasAnimation && animation.animatedUrl) {
          try {
            console.log(`Loading animated video for ${segment.photo_id}`);
            const video = await loadVideo(animation.animatedUrl);
            videos.set(segment.photo_id, video);
          } catch (err) {
            console.warn(`Failed to load animated video for ${segment.photo_id}, will use Ken Burns:`, err);
          }
        }
        
        // Always load static image as fallback
        const url = getPhotoUrl(segment.photo_id);
        if (url && !images.has(segment.photo_id)) {
          try {
            const img = await loadImage(url);
            images.set(segment.photo_id, img);
          } catch {
            console.warn(`Failed to load image for ${segment.photo_id}`);
          }
        }
      }
      
      // Count how many segments will use AI animations vs Ken Burns
      const aiAnimatedCount = Array.from(videos.keys()).length;
      const kenBurnsCount = segments.length - aiAnimatedCount;
      console.log(`Video composition: ${aiAnimatedCount} AI animated, ${kenBurnsCount} Ken Burns`);

      // Create audio context and load audio
      const audioBuffers: Map<string, AudioBuffer> = new Map();
      let hasNarrationAudio = false;
      
      audioContextRef.current = new AudioContext();
      
      for (const segment of segments) {
        if (segment.audio_url) {
          try {
            const response = await fetch(segment.audio_url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            audioBuffers.set(segment.photo_id, audioBuffer);
            hasNarrationAudio = true;
          } catch (err) {
            console.warn(`Failed to load audio for ${segment.photo_id}:`, err);
          }
        }
      }

      setState('recording');

      // Set up MediaRecorder - we always want an audio track (narration or AI video audio)
      const stream = canvas.captureStream(30);
      const audioDestination = audioContextRef.current.createMediaStreamDestination();
      const audioTrack = audioDestination.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }

      // Schedule narration audio if available
      if (hasNarrationAudio && audioContextRef.current) {
        let audioOffset = 0;
        for (const segment of segments) {
          const audioBuffer = audioBuffers.get(segment.photo_id);
          if (audioBuffer) {
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioDestination);
            source.start(audioContextRef.current.currentTime + audioOffset);
          }
          audioOffset += segment.duration || 7;
        }
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        setState('processing');
        
        const blob = new Blob(chunksRef.current, { type: mimeType });
        videoBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        
        setState('done');
        setProgress(100);
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms

      // Animation loop
      const fps = 30;
      const animationTypes: ('zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right')[] = 
        ['zoom-in', 'zoom-out', 'pan-left', 'pan-right'];

      let totalFrames = 0;
      for (const segment of segments) {
        totalFrames += (segment.duration || 7) * fps;
      }

      let frameCount = 0;
      
      for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        const segment = segments[segIdx];
        const video = videos.get(segment.photo_id);
        const img = images.get(segment.photo_id);
        const segmentFrames = (segment.duration || 7) * fps;
        const animationType = animationTypes[segIdx % animationTypes.length];

        setCurrentSegment(segIdx + 1);

        // If we have an AI-animated video, play it in real-time and capture frames
        if (video) {
          console.log(`Playing AI animation for segment ${segIdx + 1}`);
          
          // Reset video to start - keep unmuted so we capture its audio (if any)
          video.currentTime = 0;
          video.muted = false;
          
          // Connect AI video audio to output - keeps background audio from VEO/Grok (mixed with narration if both exist)
          if (audioContextRef.current) {
            try {
              const videoAudioSource = audioContextRef.current.createMediaElementSource(video);
              videoAudioSource.connect(audioDestination);
            } catch (err) {
              console.warn('Could not connect AI video audio:', err);
            }
          }
          
          // Wait for video to be ready to play
          await new Promise<void>((resolve) => {
            if (video.readyState >= 3) {
              resolve();
            } else {
              video.oncanplay = () => resolve();
            }
          });
          
          const videoDuration = video.duration || (segment.duration || 7);
          const segmentDuration = segment.duration || 7;
          // Use the shorter of video duration or segment duration
          const playDuration = Math.min(videoDuration, segmentDuration);
          const actualFrames = Math.floor(playDuration * fps);
          
          // Calculate video scaling
          const videoRatio = video.videoWidth / video.videoHeight;
          const canvasRatio = width / height;
          let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
          
          if (videoRatio > canvasRatio) {
            drawWidth = width;
            drawHeight = width / videoRatio;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
          } else {
            drawHeight = height;
            drawWidth = height * videoRatio;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
          }
          
          // Start playing the video
          try {
            await video.play();
          } catch (err) {
            console.warn('Video autoplay failed:', err);
          }
          
          // Capture frames in real-time while video plays
          const startTime = Date.now();
          for (let frame = 0; frame < actualFrames; frame++) {
            // Draw current video frame to canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
            
            // Draw narration text overlay
            if (segment.text) {
              drawNarrationText(ctx, segment.text, width, height);
            }

            frameCount++;
            setProgress(Math.round((frameCount / totalFrames) * 100));

            // Wait for next frame (real-time playback)
            const elapsed = Date.now() - startTime;
            const targetTime = (frame + 1) * (1000 / fps);
            const delay = Math.max(0, targetTime - elapsed);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          video.pause();
          
          // Fill remaining frames with Ken Burns if segment is longer than video
          const remainingFrames = segmentFrames - actualFrames;
          if (remainingFrames > 0 && img) {
            for (let frame = 0; frame < remainingFrames; frame++) {
              const progressRatio = frame / remainingFrames;
              ctx.fillStyle = '#000';
              ctx.fillRect(0, 0, width, height);
              drawFrameWithKenBurns(ctx, img, width, height, progressRatio, animationType);
              if (segment.text) {
                drawNarrationText(ctx, segment.text, width, height);
              }
              frameCount++;
              setProgress(Math.round((frameCount / totalFrames) * 100));
              await new Promise(resolve => setTimeout(resolve, 1000 / fps));
            }
          }
        } else {
          // No AI animation - use Ken Burns on static image
          for (let frame = 0; frame < segmentFrames; frame++) {
            const progressRatio = frame / segmentFrames;

            // Clear and draw
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);

            if (img) {
              drawFrameWithKenBurns(ctx, img, width, height, progressRatio, animationType);
            }

            if (segment.text) {
              drawNarrationText(ctx, segment.text, width, height);
            }

            frameCount++;
            setProgress(Math.round((frameCount / totalFrames) * 100));

            // Wait for next frame
            await new Promise(resolve => setTimeout(resolve, 1000 / fps));
          }
        }
      }

      // Stop recording
      mediaRecorderRef.current.stop();

    } catch (err) {
      console.error('Video generation error:', err);
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate video');
    }
  }, [segments, getPhotoUrl]);

  const downloadVideo = useCallback(() => {
    if (!videoUrl) return;

    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_memory.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [videoUrl, eventTitle]);

  const saveVideoToAlbum = useCallback(async () => {
    if (!videoBlobRef.current) return;

    setState('saving');
    try {
      const formData = new FormData();
      formData.append('video', videoBlobRef.current, `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_memory.webm`);

      const response = await fetch(`/api/events/${eventId}/video`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save video');
      }

      const data = await response.json();
      setSavedVideoUrl(data.videoUrl);
      setState('saved');
      
      if (onVideoSaved) {
        onVideoSaved(data.videoUrl);
      }
    } catch (err) {
      console.error('Save video error:', err);
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save video');
    }
  }, [eventId, eventTitle, onVideoSaved]);

  const handleClose = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8">
      <div className="bg-[#1a1816] rounded-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Export Video</h2>
            <p className="text-sm text-white/50">Create a shareable video from your memories</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Hidden canvas for rendering */}
          <canvas ref={canvasRef} className="hidden" />

          {state === 'idle' && (() => {
            const aiAnimatedPhotos = photos.filter(p => p.animated_url);
            const aiCount = segments.filter(s => aiAnimatedPhotos.some(p => p.id === s.photo_id)).length;
            const kenBurnsCount = segments.length - aiCount;
            const hasNarration = segments.some(s => s.audio_url);
            
            return (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-4xl">🎬</span>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Ready to Export</h3>
                <p className="text-white/50 mb-4 max-w-md mx-auto">
                  This will create a {segments.length}-segment video
                  {hasNarration ? ' with voice narration' : ''}.
                </p>
                
                {/* Animation breakdown */}
                <div className="flex justify-center gap-4 mb-4 text-sm">
                  {aiCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-full text-purple-300">
                      <span>🎬</span>
                      <span>{aiCount} AI animated</span>
                    </div>
                  )}
                  {kenBurnsCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-full text-orange-300">
                      <span>🖼️</span>
                      <span>{kenBurnsCount} Ken Burns</span>
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-white/40 mb-6">
                  Estimated duration: ~{segments.reduce((acc, s) => acc + (s.duration || 7), 0)} seconds
                </div>
                <button
                  onClick={generateVideo}
                  disabled={segments.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Generate Video
                </button>
              </div>
            );
          })()}

          {(state === 'loading' || state === 'recording' || state === 'processing') && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-4xl animate-pulse">
                  {state === 'loading' ? '📥' : state === 'recording' ? '🔴' : '⚙️'}
                </span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                {state === 'loading' && 'Loading Assets...'}
                {state === 'recording' && `Recording Segment ${currentSegment} of ${segments.length}`}
                {state === 'processing' && 'Processing Video...'}
              </h3>
              
              {/* Progress bar */}
              <div className="max-w-md mx-auto mt-6">
                <div className="flex justify-between text-sm text-white/50 mb-2">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="text-white/40 text-sm mt-4">
                Please don't close this window
              </p>
            </div>
          )}

          {state === 'done' && videoUrl && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-4xl">✅</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Video Ready!</h3>
              <p className="text-white/50 mb-6">
                Your memory video has been generated successfully.
              </p>

              {/* Video preview */}
              <div className="max-w-lg mx-auto mb-6 rounded-lg overflow-hidden bg-black">
                <VideoPlayerWithTime 
                  src={videoUrl} 
                  className="w-full"
                  style={{ maxHeight: '300px' }}
                />
              </div>

              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={saveVideoToAlbum}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                  💾 Save to Album
                </button>
                <button
                  onClick={downloadVideo}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                  📥 Download
                </button>
                <button
                  onClick={() => {
                    setState('idle');
                    setVideoUrl(null);
                  }}
                  className="px-6 py-3 bg-white/10 text-white rounded-full font-medium hover:bg-white/20 transition-colors"
                >
                  Generate Again
                </button>
              </div>
            </div>
          )}

          {state === 'saving' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-4xl animate-pulse">💾</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Saving to Album...</h3>
              <p className="text-white/50">Uploading your video</p>
            </div>
          )}

          {state === 'saved' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-4xl">🎉</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Video Saved!</h3>
              <p className="text-white/50 mb-6">
                Your video is now saved to this album and can be rewatched anytime.
              </p>

              {/* Video preview */}
              <div className="max-w-lg mx-auto mb-6 rounded-lg overflow-hidden bg-black">
                <VideoPlayerWithTime 
                  src={savedVideoUrl || videoUrl || undefined} 
                  className="w-full"
                  style={{ maxHeight: '300px' }}
                />
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={downloadVideo}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                  📥 Download
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-white/10 text-white rounded-full font-medium hover:bg-white/20 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-4xl">❌</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Export Failed</h3>
              <p className="text-red-400 mb-6">{errorMessage || 'An error occurred'}</p>
              <button
                onClick={() => setState('idle')}
                className="px-6 py-3 bg-white/10 text-white rounded-full font-medium hover:bg-white/20 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
