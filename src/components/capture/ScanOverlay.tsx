'use client';

interface ScanOverlayProps {
  isScanning: boolean;
  photoDetected: boolean;
  scanStatus: string;
}

export function ScanOverlay({ isScanning, photoDetected, scanStatus }: ScanOverlayProps) {
  if (!isScanning) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Dark vignette around scan area */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 50%, transparent 0%, rgba(0,0,0,0.7) 100%)'
        }}
      />
      
      {/* Centered scan frame */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className={`relative border-2 rounded-lg transition-all duration-300 ${
            photoDetected 
              ? 'border-green-400 border-solid shadow-2xl shadow-green-400/50' 
              : 'border-white/80 border-dashed'
          }`}
          style={{
            width: 'min(85vw, 80vh * 4/3)',
            height: 'min(63.75vw, 60vh)',
            maxWidth: '700px',
            maxHeight: '525px',
          }}
        >
          {/* Corner brackets */}
          <div className={`absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 rounded-tl-lg transition-colors ${
            photoDetected ? 'border-green-400' : 'border-white'
          }`} />
          <div className={`absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 rounded-tr-lg transition-colors ${
            photoDetected ? 'border-green-400' : 'border-white'
          }`} />
          <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 rounded-bl-lg transition-colors ${
            photoDetected ? 'border-green-400' : 'border-white'
          }`} />
          <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 rounded-br-lg transition-colors ${
            photoDetected ? 'border-green-400' : 'border-white'
          }`} />
          
          {/* Scanning animation line */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div 
              className="absolute inset-x-0 top-0 h-1"
              style={{ 
                background: `linear-gradient(to right, transparent, ${photoDetected ? '#4ade80' : '#60a5fa'}, transparent)`,
                animation: 'scanLine 2s linear infinite'
              }} 
            />
          </div>
          
          {/* Pulsing effect when detected */}
          {photoDetected && (
            <div className="absolute inset-0 rounded-lg border-2 border-green-400 animate-ping opacity-30" />
          )}
          
          {/* Status text */}
          <div className={`absolute -bottom-12 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            photoDetected 
              ? 'text-white bg-green-600/90 font-bold shadow-lg' 
              : scanStatus.includes('⚠️')
                ? 'text-white bg-yellow-600/90'
                : 'text-white bg-white/20 backdrop-blur-sm'
          }`}>
            <span className={`inline-block w-2 h-2 rounded-full animate-pulse mr-2 ${
              photoDetected ? 'bg-green-300' : scanStatus.includes('⚠️') ? 'bg-yellow-300' : 'bg-blue-400'
            }`} />
            {scanStatus || 'Align photo with corners'}
          </div>
        </div>
      </div>
    </div>
  );
}
