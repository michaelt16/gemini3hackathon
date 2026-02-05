'use client';

interface VideoPlayerWithTimeProps {
  src: string | undefined;
  className?: string;
  style?: React.CSSProperties;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export default function VideoPlayerWithTime({
  src,
  className = '',
  style,
  autoPlay = false,
  loop = false,
  muted = false,
}: VideoPlayerWithTimeProps) {
  return (
    <video
      src={src}
      controls
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      className={className}
      style={style}
      playsInline
    />
  );
}
