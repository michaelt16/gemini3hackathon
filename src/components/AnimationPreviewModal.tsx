'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import KenBurnsPhoto from './KenBurnsPhoto';

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
}

interface AnimationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  segments: Segment[];
  startFromPhotoId?: string;
  eventId: string;
}

export default function AnimationPreviewModal({
  isOpen,
  onClose,
  photos,
  segments,
  startFromPhotoId,
  eventId,
}: AnimationPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Find the starting index based on startFromPhotoId
  useEffect(() => {
    if (startFromPhotoId && segments.length > 0) {
      const idx = segments.findIndex(s => s.photo_id === startFromPhotoId);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [startFromPhotoId, segments]);

  // Check if audio exists
  useEffect(() => {
    if (isOpen && segments.length > 0) {
      setHasAudio(segments.some(s => s.audio_url));
    }
  }, [isOpen, segments]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      if (startFromPhotoId) {
        const idx = segments.findIndex(s => s.photo_id === startFromPhotoId);
        if (idx !== -1) setCurrentIndex(idx);
      } else {
        setCurrentIndex(0);
      }
    }
  }, [isOpen, startFromPhotoId, segments]);

  const currentSegment = segments[currentIndex];
  const currentPhoto = photos.find(p => p.id === currentSegment?.photo_id);
  const photoUrl = currentPhoto?.original_url || currentPhoto?.thumbnail_url;
  const segmentDuration = currentSegment?.duration || 7;

  const playAudio = useCallback((segment: Segment) => {
    if (segment.audio_url && audioRef.current) {
      audioRef.current.src = segment.audio_url;
      audioRef.current.play().catch(console.error);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const goToNext = useCallback(() => {
    if (currentIndex < segments.length - 1) {
      setCurrentIndex(prev => prev + 1);
      if (isPlaying && segments[currentIndex + 1]?.audio_url) {
        playAudio(segments[currentIndex + 1]);
      }
    } else {
      // End of slideshow
      setIsPlaying(false);
      stopAudio();
    }
  }, [currentIndex, segments, isPlaying, playAudio, stopAudio]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      stopAudio();
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, stopAudio]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      stopAudio();
    } else {
      setIsPlaying(true);
      if (currentSegment?.audio_url) {
        playAudio(currentSegment);
      }
    }
  }, [isPlaying, currentSegment, playAudio, stopAudio]);

  const generateAudio = useCallback(async () => {
    setIsLoadingAudio(true);
    try {
      const res = await fetch(`/api/events/${eventId}/narration/audio`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        // Update segments with audio URLs - this would need to be handled by parent
        setHasAudio(true);
        window.location.reload(); // Simple refresh to get updated segments
      }
    } catch (err) {
      console.error('Failed to generate audio:', err);
    } finally {
      setIsLoadingAudio(false);
    }
  }, [eventId]);

  const handleClose = useCallback(() => {
    stopAudio();
    setIsPlaying(false);
    onClose();
  }, [onClose, stopAudio]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={goToNext} />

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white/80 hover:text-white transition-colors"
      >
        ✕
      </button>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {photoUrl ? (
          <div className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl">
            <KenBurnsPhoto
              src={photoUrl}
              duration={segmentDuration}
              playing={isPlaying}
              onAnimationEnd={goToNext}
              className="w-full h-full"
            />

            {/* Narration overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-lg leading-relaxed text-center max-w-2xl mx-auto">
                {currentSegment?.text || 'No narration'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center text-white/50">
            <p>No photo available</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/50">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-4 max-w-4xl mx-auto">
          {segments.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { stopAudio(); setCurrentIndex(idx); setIsPlaying(false); }}
              className={`flex-1 h-1 rounded-full transition-colors ${
                idx === currentIndex
                  ? 'bg-white'
                  : idx < currentIndex
                  ? 'bg-white/50'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
          >
            ⏮
          </button>

          <button
            onClick={togglePlayback}
            className="w-16 h-16 rounded-full bg-white hover:bg-white/90 flex items-center justify-center text-black text-2xl transition-colors"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={goToNext}
            disabled={currentIndex === segments.length - 1}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
          >
            ⏭
          </button>
        </div>

        {/* Audio generation */}
        {!hasAudio && segments.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={generateAudio}
              disabled={isLoadingAudio}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isLoadingAudio ? 'Generating Audio...' : '🔊 Generate Voice Narration'}
            </button>
          </div>
        )}

        {/* Segment info */}
        <div className="mt-4 text-center text-white/50 text-sm">
          {currentIndex + 1} of {segments.length}
          {hasAudio && currentSegment?.audio_url && ' • With audio'}
        </div>
      </div>
    </div>
  );
}
