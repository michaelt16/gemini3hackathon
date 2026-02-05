'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import CaptureSession from './CaptureSession';
import EVAOrb from './EVAOrb';
import { AuroraWave } from './capture/AuroraWave';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle?: string;
  onPhotosAdded?: () => void;
  tutorialMode?: boolean;
}

// Tutorial steps for the capture process - EVA speaks in first person
const CAPTURE_TUTORIAL_STEPS = [
  {
    text: "This is my capture interface. Here you can add photos and tell me their stories.",
    position: 'center',
    highlight: null,
  },
  {
    text: "Point your camera at a photo, or click the scan button. I'll detect and extract photos from what you're viewing.",
    position: 'bottom-left',
    highlight: 'scan',
  },
  {
    text: "Click the microphone to talk to me. Tell me the story behind your photos - who's in them, what happened, why they matter.",
    position: 'bottom-center',
    highlight: 'mic',
  },
  {
    text: "The camera feed shows what I see. You can show me photos directly through your camera.",
    position: 'top-right',
    highlight: 'camera',
  },
  {
    text: "When you're done, click Finish to save your photos and stories. Go ahead and try adding your first memory!",
    position: 'top-right',
    highlight: 'finish',
    final: true,
  },
];

/**
 * EVA Capture Modal
 * Wraps CaptureSession in a modal overlay
 */
export default function CaptureModal({ 
  isOpen, 
  onClose, 
  eventId, 
  onPhotosAdded,
  tutorialMode = false,
}: CaptureModalProps) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialText, setTutorialText] = useState('');
  const [greetingComplete, setGreetingComplete] = useState(false);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  
  // Play tutorial step - text only (no TTS to avoid rate limits)
  const playTutorialStep = useCallback((step: number) => {
    // Clear any existing typewriter first
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }
    
    if (step >= CAPTURE_TUTORIAL_STEPS.length) {
      setShowTutorial(false);
      localStorage.setItem('captureTutorialDone', 'true');
      return;
    }
    
    setTutorialStep(step);
    const stepData = CAPTURE_TUTORIAL_STEPS[step];
    setTutorialText('');
    
    // Typewriter effect without TTS (saves API quota for intro)
    const chars = stepData.text.split('');
    let i = 0;
    typewriterRef.current = setInterval(() => {
      if (i < chars.length) {
        const char = chars[i]; // Capture char value immediately
        setTutorialText(prev => prev + char);
        i++;
      } else {
        if (typewriterRef.current) {
          clearInterval(typewriterRef.current);
          typewriterRef.current = null;
        }
      }
    }, 25); // ~40 chars/sec
  }, []);
  
  // Handle EVA's greeting complete
  const handleGreetingComplete = useCallback(() => {
    console.log('[CaptureModal] EVA greeting complete');
    setGreetingComplete(true);
  }, []);
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clear typewriter
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
      setGreetingComplete(false);
      setShowTutorial(false);
      setTutorialStep(0);
      setTutorialText('');
    }
  }, [isOpen]);
  
  // Start tutorial after EVA finishes her greeting (not immediately)
  useEffect(() => {
    if (isOpen && tutorialMode && greetingComplete) {
      // Small delay after greeting completes, then start tutorial
      const timer = setTimeout(() => {
        setShowTutorial(true);
        playTutorialStep(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, tutorialMode, greetingComplete, playTutorialStep]);
  
  const advanceTutorial = useCallback(() => {
    const nextStep = tutorialStep + 1;
    if (nextStep < CAPTURE_TUTORIAL_STEPS.length) {
      playTutorialStep(nextStep);
    } else {
      setShowTutorial(false);
      localStorage.setItem('captureTutorialDone', 'true');
    }
  }, [tutorialStep, playTutorialStep]);
  
  const skipTutorial = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem('captureTutorialDone', 'true');
  }, []);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStep = CAPTURE_TUTORIAL_STEPS[tutorialStep];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        // Close on backdrop click only if clicking the backdrop itself
        if (e.target === e.currentTarget && !showTutorial) {
          onClose();
        }
      }}
    >
      {/* Modal container */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 rounded-2xl overflow-hidden shadow-2xl">
        <CaptureSession
          eventId={eventId}
          isModal={true}
          onClose={onClose}
          onPhotosAdded={onPhotosAdded}
          onGreetingComplete={tutorialMode ? handleGreetingComplete : undefined}
        />
      </div>
      
      {/* Tutorial overlay */}
      {showTutorial && (
        <>
          {/* Semi-transparent overlay */}
          <div className="fixed inset-0 z-[110] bg-black/50" />
          
          {/* Tutorial card - matching album tutorial style */}
          <div className={`fixed z-[120] w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a0a0f] to-[#0f0a15] border border-cyan-500/30 shadow-2xl flex flex-col transition-all duration-300 ${
            currentStep?.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
            currentStep?.position === 'bottom-left' ? 'bottom-32 left-12 md:left-20' :
            currentStep?.position === 'bottom-center' ? 'bottom-32 left-1/2 -translate-x-1/2' :
            currentStep?.position === 'top-right' ? 'top-24 right-12 md:right-20' :
            'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-white/70 text-xs">EVA</span>
                <span className="text-white/30 text-xs ml-2">
                  {tutorialStep + 1}/{CAPTURE_TUTORIAL_STEPS.length}
                </span>
              </div>
              <button
                onClick={skipTutorial}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Skip tutorial"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Main content */}
            <div className="flex flex-col items-center py-6 px-5">
              {/* EVA Orb */}
              <div className="mb-4">
                <EVAOrb size={80} isSpeaking={false} />
              </div>
              
              {/* Tutorial text */}
              <div className="text-center mb-5 min-h-[60px]">
                <p 
                  className="text-white text-base leading-relaxed"
                  style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                >
                  {tutorialText}
                  {tutorialText && <span className="animate-pulse ml-1">|</span>}
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={currentStep?.final ? skipTutorial : advanceTutorial}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white text-sm rounded-xl font-medium hover:from-cyan-500 hover:to-cyan-400 transition-all"
                >
                  {currentStep?.final ? 'Got it!' : 'Next'}
                </button>
              </div>
              
              {/* Step indicator */}
              <div className="flex justify-center gap-1.5 mt-4">
                {CAPTURE_TUTORIAL_STEPS.map((_, i) => (
                  <div 
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${i === tutorialStep ? 'bg-cyan-400' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            </div>
            
            {/* Aurora Wave at bottom */}
            <div className="h-12 relative">
              <AuroraWave 
                isActive={showTutorial}
                isAISpeaking={false} 
                userAudioLevel={0} 
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
