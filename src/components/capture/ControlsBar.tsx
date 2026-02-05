'use client';

interface ControlsBarProps {
  // Camera
  cameraActive: boolean;
  videoReady: boolean;
  onCameraToggle: () => void;
  // Scanning
  isScanning: boolean;
  isExtracting: boolean;
  onScanToggle: () => void;
  // Mic
  isConnected: boolean;
  isMicActive: boolean;
  onMicToggle: () => void;
  // Session
  isFinishing: boolean;
  photoCount: number;
  onFinishSession: () => void;
  // Optional: hide finish button (for modal mode where it's in header)
  hideFinishButton?: boolean;
}

export function ControlsBar({
  cameraActive,
  videoReady,
  onCameraToggle,
  isScanning,
  isExtracting,
  onScanToggle,
  isConnected,
  isMicActive,
  onMicToggle,
  isFinishing,
  photoCount,
  onFinishSession,
  hideFinishButton = false,
}: ControlsBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
      <div className="flex items-center justify-center gap-4">
        
        {/* Camera toggle */}
        <button
          onClick={onCameraToggle}
          disabled={!isConnected}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            !isConnected 
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : cameraActive 
                ? 'bg-blue-500/30 border border-blue-400/50 text-blue-400' 
                : 'bg-white/10 border border-white/20 text-white/60 hover:text-white hover:border-white/40'
          }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </button>
        
        {/* Scan mode toggle */}
        <button
          onClick={onScanToggle}
          disabled={!cameraActive || !videoReady || isExtracting}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all relative ${
            !cameraActive || !videoReady || isExtracting
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : isScanning
                ? 'bg-green-500/30 border-2 border-green-400 text-green-400 shadow-lg shadow-green-400/30'
                : 'bg-white/10 border border-white/20 text-white/60 hover:text-white hover:border-white/40'
          }`}
          title={isScanning ? 'Stop scanning' : 'Scan photo'}
        >
          {isScanning && (
            <span className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-30" />
          )}
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h3.75v3.75H3.75V4.5zM3.75 15.75h3.75v3.75H3.75v-3.75zM15.75 4.5h4.5v3.75h-4.5V4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25v2.25h2.25M5.25 18.75v-2.25h2.25M18.75 5.25v2.25h-2.25M15.75 15.75h4.5v4.5h-4.5v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 18.75v-2.25h-2.25" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v7.5M8.25 12h7.5" />
          </svg>
        </button>
        
        {/* Main mic button */}
        <button
          onClick={onMicToggle}
          disabled={!isConnected}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            !isConnected
              ? 'bg-white/5 text-white/30 cursor-not-allowed'
              : isMicActive 
                ? 'bg-white text-gray-900' 
                : 'bg-white/10 border border-white/30 text-white hover:border-white/50'
          }`}
        >
          {isMicActive && (
            <div 
              className="absolute inset-0 rounded-full border-2 border-white/50"
              style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}
            />
          )}
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </button>
        
        {/* Finish Session button (hidden in modal mode) */}
        {!hideFinishButton && (
          <button
            onClick={onFinishSession}
            disabled={isFinishing || photoCount === 0}
            className={`px-4 h-14 rounded-full flex items-center justify-center gap-2 transition-all ${
              isFinishing || photoCount === 0
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {isFinishing ? (
              <>
                <span className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                <span className="text-sm font-medium">Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-sm font-medium">Finish</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
