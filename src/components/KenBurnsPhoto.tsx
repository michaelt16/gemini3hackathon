'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

type AnimationType = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';

interface KenBurnsPhotoProps {
  src: string;
  alt?: string;
  duration?: number; // in seconds
  animationType?: AnimationType | 'random';
  playing?: boolean;
  onAnimationEnd?: () => void;
  className?: string;
}

const ANIMATION_TYPES: AnimationType[] = [
  'zoom-in',
  'zoom-out',
  'pan-left',
  'pan-right',
  'pan-up',
  'pan-down',
];

function getRandomAnimation(photoId?: string): AnimationType {
  // Use photoId to get consistent animation per photo if provided
  if (photoId) {
    const hash = photoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return ANIMATION_TYPES[hash % ANIMATION_TYPES.length];
  }
  return ANIMATION_TYPES[Math.floor(Math.random() * ANIMATION_TYPES.length)];
}

export default function KenBurnsPhoto({
  src,
  alt = '',
  duration = 7,
  animationType = 'random',
  playing = true,
  onAnimationEnd,
  className = '',
}: KenBurnsPhotoProps) {
  const [isPlaying, setIsPlaying] = useState(playing);
  const containerRef = useRef<HTMLDivElement>(null);

  const animation = useMemo(() => {
    return animationType === 'random' ? getRandomAnimation(src) : animationType;
  }, [animationType, src]);

  useEffect(() => {
    setIsPlaying(playing);
  }, [playing]);

  useEffect(() => {
    if (!isPlaying || !onAnimationEnd) return;

    const timer = setTimeout(() => {
      onAnimationEnd();
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [isPlaying, duration, onAnimationEnd]);

  // Generate CSS transform based on animation type
  const getAnimationStyle = () => {
    const baseStyle = {
      transition: isPlaying ? `transform ${duration}s ease-in-out` : 'none',
    };

    if (!isPlaying) {
      return { ...baseStyle, transform: 'scale(1) translate(0, 0)' };
    }

    switch (animation) {
      case 'zoom-in':
        return { ...baseStyle, transform: 'scale(1.15)' };
      case 'zoom-out':
        return { ...baseStyle, transform: 'scale(0.95)' };
      case 'pan-left':
        return { ...baseStyle, transform: 'scale(1.1) translateX(-5%)' };
      case 'pan-right':
        return { ...baseStyle, transform: 'scale(1.1) translateX(5%)' };
      case 'pan-up':
        return { ...baseStyle, transform: 'scale(1.1) translateY(-5%)' };
      case 'pan-down':
        return { ...baseStyle, transform: 'scale(1.1) translateY(5%)' };
      default:
        return { ...baseStyle, transform: 'scale(1.1)' };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        style={getAnimationStyle()}
        draggable={false}
      />
    </div>
  );
}

// Export animation types for external use
export { ANIMATION_TYPES };
export type { AnimationType };
