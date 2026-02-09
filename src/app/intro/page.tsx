'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import EVAOrb from '@/components/EVAOrb';
import { AuroraWave } from '@/components/capture/AuroraWave';
import { GeminiLiveClient, getAuthToken } from '@/lib/gemini-live';

// EVA's script - combined into continuous speech blocks for natural flow
// Each line is spoken as one continuous audio clip
const SCENES = [
  {
    id: 'awakening',
    hasBackgroundAnimation: false,
    lines: [
      { text: "Hello. I'm Eva. I keep your memories safe... forever.", delay: 500, duration: 5000 },
    ],
  },
  {
    id: 'problem',
    hasBackgroundAnimation: true,
    lines: [
      { text: "Memories fade. Stories get lost. But they don't have to.", delay: 200, duration: 5000 },
    ],
  },
  {
    id: 'capture',
    hasBackgroundAnimation: true,
    lines: [
      { text: "Show me your photographs. Old albums. Faded prints. I'll see them the way you see them.", delay: 300, duration: 7000 },
    ],
  },
  {
    id: 'questions',
    hasBackgroundAnimation: true,
    lines: [
      { text: "Ask the questions you've always wanted to ask. What was grandpa really like? How did you two meet? Those conversations you keep meaning to have... have them now. I'll help you remember every word.", delay: 300, duration: 12000 },
    ],
  },
  {
    id: 'story',
    hasBackgroundAnimation: true,
    lines: [
      { text: "Tell me what happened. Who was there. Why it mattered. I'll listen. I'll remember.", delay: 200, duration: 7000 },
    ],
  },
  {
    id: 'collaboration',
    hasBackgroundAnimation: true,
    lines: [
      { text: "Everyone sees things differently. Mom remembers the laughter. Dad remembers the drive. I'll collect each perspective and weave them into one complete story.", delay: 300, duration: 10000 },
    ],
  },
  {
    id: 'film',
    hasBackgroundAnimation: true,
    lines: [
      { text: "When you're ready, I'll turn your memories into a film you can share. A gift. A piece of you that lasts.", delay: 300, duration: 8000 },
    ],
  },
  {
    id: 'scrapbook',
    hasBackgroundAnimation: true,
    lines: [
      { text: "Or keep it simple — an animated scrapbook that breathes with your stories.", delay: 300, duration: 6000 },
    ],
  },
  {
    id: 'invitation',
    hasBackgroundAnimation: false,
    lines: [
      { text: "This is Living Memory. Your stories will live here forever.", delay: 200, duration: 5000 },
      { text: "Now, what should I call you?", delay: 300, duration: 3000 },
    ],
  },
];

// Scene-specific positioning for orb and text (fine-tuned per scene)
const SCENE_POSITIONS: Record<string, { orbTop: string; textTop: string }> = {
  'awakening': { orbTop: '28%', textTop: '48%' },
  'problem': { orbTop: '18%', textTop: '65%' },
  'capture': { orbTop: '12%', textTop: '68%' },      // Orb higher
  'questions': { orbTop: '18%', textTop: '58%' },    // Text higher
  'story': { orbTop: '18%', textTop: '65%' },
  'collaboration': { orbTop: '12%', textTop: '55%' }, // Both higher
  'film': { orbTop: '18%', textTop: '58%' },         // Text higher
  'scrapbook': { orbTop: '12%', textTop: '65%' },    // Orb higher
  'invitation': { orbTop: '28%', textTop: '48%' },
};

// Default positioning
const DEFAULT_POSITION = { orbTop: '28%', textTop: '48%' };

export default function IntroPage() {
  const router = useRouter();
  
  // Scene state
  const [currentSceneIndex, setCurrentSceneIndex] = useState(-1); // -1 = not started
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [orbVisible, setOrbVisible] = useState(false);
  const [orbScale, setOrbScale] = useState(0);
  const [showNameInput, setShowNameInput] = useState(false);
  const [userName, setUserName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  
  // Tutorial flow after name
  const [tutorialPhase, setTutorialPhase] = useState<'none' | 'greeting' | 'options' | 'album-name' | 'creating'>('none');
  const [tutorialText, setTutorialText] = useState('');
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [albumName, setAlbumName] = useState('');
  
  // Live API refs
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const pendingAdvanceRef = useRef(false); // Flag to advance on turn complete
  const pendingTextRef = useRef<string | null>(null); // Text to type when audio starts
  const pendingCallbackRef = useRef<(() => void) | null>(null); // Callback for tutorial flow
  const useTutorialTextRef = useRef(false); // Whether to use tutorialText state (for tutorial phase)
  const pendingNavigateRef = useRef<{ albumId: string; phase: 'name_response' | 'redirect_message' } | null>(null); // For two-phase navigation
  
  // Typewriter effect
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const sceneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tutorialIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const introStartedRef = useRef(false);
  
  // Connect to Live API for voice narration
  const connectLiveAPI = useCallback(async (): Promise<boolean> => {
    if (isLiveConnecting || isLiveConnected) return isLiveConnected;
    
    setIsLiveConnecting(true);
    
    try {
      const auth = await getAuthToken();
      const apiKey = auth.apiKey || auth.token;
      if (!apiKey) throw new Error('Failed to get API credentials');
      
      return new Promise((resolve) => {
        const client = new GeminiLiveClient(apiKey, {
          responseModalities: ['AUDIO'],
          systemInstruction: `You are EVA, a warm AI companion for Living Memory. 
When asked to say something, speak it exactly as written with natural, warm delivery.
Keep responses brief and emotional. Do not add any extra commentary.`,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        }, {
          onConnect: () => {
            console.log('[EVA Intro] Live API connected successfully');
            setIsLiveConnected(true);
            setIsLiveConnecting(false);
            liveClientRef.current = client;
            resolve(true);
          },
          onDisconnect: () => {
            setIsLiveConnected(false);
          },
          onAudio: () => {
            console.log('[EVA Intro] Audio received, starting playback');
            setIsAISpeaking(true);
            // Start typewriter when audio starts (syncs text with voice)
            if (pendingTextRef.current) {
              const text = pendingTextRef.current;
              const useTutorialText = useTutorialTextRef.current;
              pendingTextRef.current = null;
              console.log('[EVA Intro] Starting typewriter for:', text.substring(0, 50) + '...');
              // Estimate duration based on text length (~60ms per char for Live API)
              const estimatedDuration = Math.max(3000, text.length * 60);
              // Dispatch event to trigger typewriter (avoids stale closure)
              window.dispatchEvent(new CustomEvent('eva-start-typing', { 
                detail: { text, duration: estimatedDuration, useTutorialText } 
              }));
            }
          },
          onTurnComplete: () => {
            setIsAISpeaking(false);
            // If we're waiting to advance scene, do it now
            // Add delay to ensure audio buffer finishes playing
            if (pendingAdvanceRef.current) {
              pendingAdvanceRef.current = false;
              setTimeout(() => {
                setCurrentLineIndex(prev => prev + 1);
              }, 800); // Wait for audio buffer to finish
            }
            // Handle two-phase navigation (like album modal)
            if (pendingNavigateRef.current) {
              const pending = pendingNavigateRef.current;
              if (pending.phase === 'name_response') {
                // EVA responded to the name, now say redirect message
                const redirectText = "Give me a moment—I'll take you to the editor now.";
                pendingTextRef.current = redirectText;
                useTutorialTextRef.current = true;
                client.sendText(`Say exactly: "${redirectText}"`);
                pending.phase = 'redirect_message';
              } else if (pending.phase === 'redirect_message') {
                // EVA said redirect message, now navigate
                pendingNavigateRef.current = null;
                // Use window dispatch to call router (avoids stale closure)
                window.dispatchEvent(new CustomEvent('eva-navigate', { 
                  detail: { albumId: pending.albumId } 
                }));
              }
              return;
            }
            // If there's a tutorial callback, call it
            if (pendingCallbackRef.current) {
              const cb = pendingCallbackRef.current;
              pendingCallbackRef.current = null;
              cb();
            }
          },
          onError: (error) => {
            console.error('[EVA Intro] Live API error:', error);
            setIsLiveConnecting(false);
            resolve(false);
          },
        });
        
        client.connect().catch(() => {
          setIsLiveConnecting(false);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Failed to connect Live API:', error);
      setIsLiveConnecting(false);
      return false;
    }
  }, [isLiveConnecting, isLiveConnected]);
  
  // Disconnect Live API
  const disconnectLiveAPI = useCallback(() => {
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setIsLiveConnected(false);
  }, []);
  
  // Send text to Live API for EVA to speak
  // Set pendingAdvance=true for intro scenes, false for tutorial (uses callback instead)
  const speakWithLiveAPI = useCallback((text: string, pendingAdvance: boolean = true, onComplete?: () => void) => {
    if (!liveClientRef.current?.connected) return false;
    // Store text to type when audio starts (syncs with voice)
    pendingTextRef.current = text;
    pendingAdvanceRef.current = pendingAdvance;
    if (onComplete) {
      pendingCallbackRef.current = onComplete;
    }
    // Tell EVA to say the line exactly
    liveClientRef.current.sendText(`Say exactly: "${text}"`);
    return true;
  }, []);
  
  
  // Start the intro - connect to Live API
  const startIntro = useCallback(async () => {
    // Connect to Live API first
    setIsGeneratingAudio(true);
    const connected = await connectLiveAPI();
    setIsGeneratingAudio(false);
    
    if (!connected) {
      console.warn('Live API connection failed, proceeding without voice');
    }
    
    setCurrentSceneIndex(0);
    setCurrentLineIndex(0);
    
    // Animate orb appearance
    setTimeout(() => {
      setOrbVisible(true);
      setTimeout(() => setOrbScale(1), 100);
    }, 300);
  }, [connectLiveAPI]);
  
  // Typewriter effect for text - synced to audio duration
  const typeText = useCallback((text: string, audioDurationMs: number, onComplete: () => void, useTutorialText: boolean = false) => {
    setIsTyping(true);
    if (useTutorialText) {
      setTutorialText('');
    } else {
      setDisplayedText('');
    }
    
    const chars = text.split('');
    let currentIndex = 0;
    
    // Calculate ms per character to match audio - aim to finish ~600ms before audio ends
    const totalTime = audioDurationMs > 0 ? audioDurationMs - 600 : chars.length * 28;
    const msPerChar = Math.max(12, Math.min(35, totalTime / chars.length));
    
    const type = () => {
      if (currentIndex < chars.length) {
        const char = chars[currentIndex];
        if (useTutorialText) {
          setTutorialText(prev => (prev ?? '') + char);
        } else {
          setDisplayedText(prev => prev + char);
        }
        currentIndex++;
        // Small random variation for natural feel (±10%)
        const variation = msPerChar * 0.1 * (Math.random() - 0.5);
        typewriterRef.current = setTimeout(type, msPerChar + variation);
      } else {
        setIsTyping(false);
        onComplete();
      }
    };
    
    // Start with first character immediately
    if (chars.length > 0) {
      if (useTutorialText) {
        setTutorialText(chars[0]);
      } else {
        setDisplayedText(chars[0]);
      }
      currentIndex = 1;
      typewriterRef.current = setTimeout(type, msPerChar);
    } else {
      setIsTyping(false);
      onComplete();
    }
  }, []);
  
  // Listen for eva-start-typing events (triggered when Live API audio starts)
  useEffect(() => {
    const handleStartTyping = (e: CustomEvent<{ text: string; duration: number; useTutorialText?: boolean }>) => {
      const { text, duration, useTutorialText } = e.detail;
      typeText(text, duration, () => {}, useTutorialText ?? false);
    };
    
    window.addEventListener('eva-start-typing', handleStartTyping as EventListener);
    return () => {
      window.removeEventListener('eva-start-typing', handleStartTyping as EventListener);
    };
  }, [typeText]);
  
  // Listen for eva-navigate events (triggered when EVA finishes redirect message)
  useEffect(() => {
    const handleNavigate = (e: CustomEvent<{ albumId: string }>) => {
      disconnectLiveAPI();
      router.push(`/album/${e.detail.albumId}?tutorial=true`);
    };
    
    window.addEventListener('eva-navigate', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('eva-navigate', handleNavigate as EventListener);
    };
  }, [router, disconnectLiveAPI]);
  
  // Process current line
  useEffect(() => {
    if (currentSceneIndex < 0 || currentSceneIndex >= SCENES.length) return;
    
    const scene = SCENES[currentSceneIndex];
    if (currentLineIndex >= scene.lines.length) {
      // Move to next scene - wait a bit for visual transition
      if (currentSceneIndex < SCENES.length - 1) {
        sceneTimeoutRef.current = setTimeout(() => {
          setCurrentSceneIndex(prev => prev + 1);
          setCurrentLineIndex(0);
        }, 500); // Brief pause before transitioning to next scene
      } else {
        // Show name input after last scene
        // Keep Live API connected for tutorial greeting
        setTimeout(() => setShowNameInput(true), 1000);
      }
      return;
    }
    
    const line = scene.lines[currentLineIndex];
    
    // Delay before starting this line
    sceneTimeoutRef.current = setTimeout(async () => {
      // Use Live API: Send text to EVA, advance happens via onTurnComplete
      if (liveClientRef.current?.connected) {
        console.log('[EVA Intro] Speaking line via Live API:', line.text.substring(0, 50) + '...');
        // Use displayedText (not tutorialText) for intro scenes
        useTutorialTextRef.current = false;
        // Send to Live API - typewriter starts when onAudio fires (synced with voice)
        // onTurnComplete will advance to next line
        speakWithLiveAPI(line.text, true);
        return;
      }
      
      // Live API not connected - fallback to text-only with timing
      console.log('[EVA Intro] Live API not connected, using text-only fallback');
      
      let advanced = false;
      const advanceToNext = () => {
        if (advanced) return;
        advanced = true;
        setCurrentLineIndex(prev => prev + 1);
      };
      
      // Typewriter runs with estimated duration
      typeText(line.text, line.duration || 5000, () => {
        // Advance after brief pause
        setTimeout(advanceToNext, 800);
      });
    }, line.delay);
    
    return () => {
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
      if (sceneTimeoutRef.current) clearTimeout(sceneTimeoutRef.current);
    };
  }, [currentSceneIndex, currentLineIndex, typeText, speakWithLiveAPI]);
  
  // Handle name submission - start tutorial flow
  const handleNameSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    
    // Store name in localStorage
    localStorage.setItem('userName', userName.trim());
    
    // Register user in database (non-blocking)
    // Only send inviteCode if the user actually typed one — otherwise standalone account
    const trimmedInvite = inviteCode.trim();
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName.trim(), inviteCode: trimmedInvite || undefined }),
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.member) {
          // Set as active user including family_code
          localStorage.setItem('active_user_id', data.member.id);
          localStorage.setItem('active_user_name', data.member.name);
          localStorage.setItem('active_user_color', data.member.avatar_color);
          localStorage.setItem('active_user_relationship', data.member.relationship || 'Self');
          localStorage.setItem('active_user_family_code', data.member.family_code || '');
        }
      }
    }).catch(() => { /* non-critical */ });
    
    // Hide name input, clear old text, start tutorial greeting
    setShowNameInput(false);
    setDisplayedText(''); // Clear the old "But first... what should I call you?" text
    setTutorialPhase('greeting');
    
    const greetingText = `Nice to meet you, ${userName.trim()}! Do you have some memories you'd like to preserve today?`;
    
    // Clear any previous typewriter
    if (tutorialIntervalRef.current) {
      clearInterval(tutorialIntervalRef.current);
      tutorialIntervalRef.current = null;
    }
    setTutorialText('');
    
    // Use Live API if connected
    if (liveClientRef.current?.connected) {
      // Store text for tutorial display (onAudio will trigger typing)
      pendingTextRef.current = greetingText;
      useTutorialTextRef.current = true; // Use tutorialText state for display
      pendingAdvanceRef.current = false; // Don't advance scene index
      pendingCallbackRef.current = () => {
        // Show options after EVA finishes speaking
        setTimeout(() => setTutorialPhase('options'), 300);
      };
      // Tell EVA to greet the user
      liveClientRef.current.sendText(`Say exactly: "${greetingText}"`);
      return;
    }
    
    // Fallback: typewriter without voice
    const chars = greetingText.split('');
    let i = 0;
    tutorialIntervalRef.current = setInterval(() => {
      if (i < chars.length) {
        const ch = chars[i];
        setTutorialText(prev => (prev ?? '') + (ch ?? ''));
        i++;
      } else {
        if (tutorialIntervalRef.current) {
          clearInterval(tutorialIntervalRef.current);
          tutorialIntervalRef.current = null;
        }
        // Show options after text completes
        setTimeout(() => setTutorialPhase('options'), 500);
      }
    }, 30);
  }, [userName, inviteCode]);
  
  // Handle tutorial option: Start preserving - ask for album name
  const handleStartTutorial = useCallback(() => {
    setTutorialPhase('album-name');
    setAlbumName(`${userName.trim()}'s Memories`); // Default suggestion
    
    // Clear any previous typewriter
    if (tutorialIntervalRef.current) {
      clearInterval(tutorialIntervalRef.current);
      tutorialIntervalRef.current = null;
    }
    
    const askText = "What would you like to call this memory collection?";
    setTutorialText('');
    
    // Use Live API if connected
    if (liveClientRef.current?.connected) {
      pendingTextRef.current = askText;
      useTutorialTextRef.current = true;
      pendingAdvanceRef.current = false; // Don't advance scene index
      pendingCallbackRef.current = null; // No callback - just wait for user to enter name
      liveClientRef.current.sendText(`Say exactly: "${askText}"`);
      return;
    }
    
    // Fallback: typewriter without voice
    const chars = askText.split('');
    let i = 0;
    tutorialIntervalRef.current = setInterval(() => {
      if (i < chars.length) {
        const ch = chars[i];
        setTutorialText(prev => (prev ?? '') + (ch ?? ''));
        i++;
      } else {
        if (tutorialIntervalRef.current) {
          clearInterval(tutorialIntervalRef.current);
          tutorialIntervalRef.current = null;
        }
      }
    }, 30);
  }, [userName]);
  
  // Handle album name submission - create the album
  const handleAlbumNameSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumName.trim()) return;
    
    setTutorialPhase('creating');
    setIsCreatingAlbum(true);
    
    try {
      // Create first album
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: albumName.trim(),
          album_type: 'event',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('tutorialMode', 'true');
        localStorage.setItem('tutorialStep', '0');
        
        // Use Live API: EVA responds to album name, then says redirect message, then navigate
        if (liveClientRef.current?.connected) {
          // Set up two-phase navigation
          pendingNavigateRef.current = { albumId: data.id, phase: 'name_response' };
          pendingAdvanceRef.current = false;
          pendingCallbackRef.current = null;
          // Tell EVA about the album name - she'll respond, then onTurnComplete handles the rest
          liveClientRef.current.sendText(`The user just created an album called "${albumName.trim()}". Say something brief and excited about the name.`);
        } else {
          // Fallback: transition after delay
          setTimeout(() => {
            router.push(`/album/${data.id}?tutorial=true`);
          }, 1500);
        }
      } else {
        // Fallback to album list
        router.push('/album');
      }
    } catch {
      router.push('/album');
    }
  }, [albumName, router, disconnectLiveAPI]);
  
  // Handle tutorial option: Just browse
  const handleSkipTutorial = useCallback(() => {
    disconnectLiveAPI();
    setIsTransitioning(true);
    setTimeout(() => {
      router.push('/album');
    }, 1000);
  }, [router, disconnectLiveAPI]);
  
  // Skip intro — jump straight to registration form
  const handleSkip = useCallback(() => {
    disconnectLiveAPI();
    // Jump to the last scene so the name input shows
    setCurrentSceneIndex(SCENES.length - 1);
    setCurrentLineIndex(SCENES[SCENES.length - 1].lines.length);
    setShowNameInput(true);
  }, [disconnectLiveAPI]);
  
  // Keep startIntro in a ref so we can call it from mount effect without re-running
  const startIntroRef = useRef(startIntro);
  startIntroRef.current = startIntro;
  
  // Initialize - auto-start intro on mount (no Begin button)
  useEffect(() => {
    // Auto-start intro after brief delay for page to render
    const timer = setTimeout(() => {
      if (!introStartedRef.current) {
        introStartedRef.current = true;
        startIntroRef.current();
      }
    }, 600);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);
  
  // Cleanup Live API on unmount
  useEffect(() => {
    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
    };
  }, []);
  
  // Get current scene ID for visual switching
  const currentSceneId = currentSceneIndex >= 0 ? SCENES[currentSceneIndex]?.id : null;
  
  // Get scene-specific positioning
  const scenePosition = currentSceneId ? (SCENE_POSITIONS[currentSceneId] || DEFAULT_POSITION) : DEFAULT_POSITION;
  
  return (
    <main className="h-screen w-screen relative overflow-hidden bg-black">
      {/* Background layers based on scene */}
      <div className="absolute inset-0 transition-opacity duration-1000">
        {/* Scene: Problem - fading vintage photos (pic1-9) */}
        {currentSceneId === 'problem' && (
          <div className="absolute inset-0">
            {['/pic1.PNG', '/pic2.PNG', '/pic3.PNG', '/pic4.PNG', '/pic5.jpg', '/pic6.jpg', '/pic7.jpg', '/pic8.jpg', '/pic9.jpg'].map((src, i) => (
              <div
                key={i}
                className="absolute photo-fragment overflow-hidden"
                style={{
                  '--rotation': `${-8 + (i % 3) * 5}deg`,
                  left: `${3 + (i % 3) * 30}%`,
                  top: `${5 + Math.floor(i / 3) * 30}%`,
                  width: '200px',
                  height: '150px',
                  borderRadius: '4px',
                  opacity: 0,
                  animation: `fragmentFade ${3 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.4}s`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                } as React.CSSProperties}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{
                    filter: 'sepia(0.4) contrast(0.9) brightness(0.7)',
                  }}
                />
                {/* Vintage fade overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(80,60,40,0.5) 0%, rgba(40,30,20,0.6) 100%)',
                  }}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Scene: Capture - camera interface */}
        {currentSceneId === 'capture' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '-10%' }}>
            <div className="relative w-[500px] h-[375px] capture-frame">
              {/* Camera frame */}
              <div className="absolute inset-0 border-2 border-amber-500/30 rounded-lg">
                {/* Corner brackets */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-amber-400/60 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-amber-400/60 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-amber-400/60 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-amber-400/60 rounded-br-lg" />
                
                {/* Scan line */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent scan-line" />
                
                {/* Photo emerging */}
                <div className="absolute inset-8 bg-gradient-to-br from-amber-900/20 to-amber-800/10 rounded photo-emerge">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-amber-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Scene: Questions - floating question bubbles */}
        {currentSceneId === 'questions' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '-10%' }}>
            <div className="relative w-full max-w-3xl h-80">
              {/* Warm family silhouettes in background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="flex gap-8">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-16 h-20 rounded-full bg-gradient-to-b from-amber-400/40 to-amber-600/20"
                      style={{
                        animation: `gentlePulse 3s ease-in-out infinite`,
                        animationDelay: `${i * 0.5}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Question bubbles rising */}
              {['What was grandpa like?', 'How did you meet?', 'Tell me about...', 'Who was there?', 'Why did you...'].map((question, i) => (
                <div
                  key={i}
                  className="absolute px-4 py-2 bg-cyan-500/10 border border-cyan-400/30 rounded-full text-cyan-300/60 text-sm question-bubble"
                  style={{
                    left: `${10 + (i * 18) % 70}%`,
                    bottom: `${10 + (i * 12) % 40}%`,
                    animationDelay: `${i * 0.6}s`,
                  }}
                >
                  {question}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Scene: Story - conversation waves */}
        {currentSceneId === 'story' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '-10%' }}>
            <div className="relative w-full max-w-2xl h-64">
              {/* Sound waves */}
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/30 sound-wave"
                  style={{
                    width: `${100 + i * 80}px`,
                    height: `${100 + i * 80}px`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
              
              {/* Text fragments floating */}
              <div className="absolute inset-0">
                {['Who', 'When', 'Where', 'Why', 'What'].map((word, i) => (
                  <span
                    key={word}
                    className="absolute text-cyan-400/40 text-sm font-light floating-word"
                    style={{
                      left: `${15 + i * 18}%`,
                      top: `${30 + (i % 2) * 40}%`,
                      animationDelay: `${i * 0.5}s`,
                    }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Scene: Collaboration - multiple POVs */}
        {currentSceneId === 'collaboration' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '-10%' }}>
            <div className="relative w-full max-w-3xl h-80">
              {/* Central photo placeholder */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-40 bg-gradient-to-br from-amber-800/30 to-amber-900/20 rounded-lg border border-amber-500/20 photo-emerge" />
              
              {/* POV quotes around the photo */}
              {[
                { text: '"I remember the laughter..."', pos: 'left-[5%] top-[20%]', color: 'emerald' },
                { text: '"Dad was so proud that day"', pos: 'right-[5%] top-[25%]', color: 'cyan' },
                { text: '"The drive there was an adventure"', pos: 'left-[10%] bottom-[20%]', color: 'purple' },
                { text: '"Everyone was together"', pos: 'right-[8%] bottom-[25%]', color: 'amber' },
              ].map((pov, i) => (
                <div
                  key={i}
                  className={`absolute ${pov.pos} px-3 py-2 bg-${pov.color}-500/10 border border-${pov.color}-400/30 rounded-lg text-${pov.color}-300/70 text-xs pov-quote`}
                  style={{
                    animationDelay: `${i * 0.4}s`,
                    maxWidth: '160px',
                  }}
                >
                  {pov.text}
                </div>
              ))}
              
              {/* Connecting lines hint */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2 w-24 h-px bg-gradient-to-r from-cyan-400/20 to-transparent connection-line"
                    style={{
                      transform: `rotate(${i * 90 + 45}deg)`,
                      transformOrigin: 'left center',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Scene: Film - timeline */}
        {currentSceneId === 'film' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '-10%' }}>
            <div className="relative w-full max-w-4xl h-48 overflow-hidden">
              {/* Film strip */}
              <div className="absolute inset-y-0 left-0 right-0 flex items-center film-strip">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-32 h-24 mx-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-amber-500/20 border border-white/10 film-frame"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center play-button">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Scene: Scrapbook - animated scrapbook page */}
        {currentSceneId === 'scrapbook' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '-10%' }}>
            <div className="relative w-80 h-96 scrapbook-page">
              {/* Paper texture background */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-100/10 to-amber-200/5 rounded-lg border border-amber-300/20 shadow-xl">
                {/* Decorative tape */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-amber-400/30 rotate-2" />
                
                {/* Photo placeholder with gentle animation */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 h-36 bg-gradient-to-br from-amber-700/20 to-amber-800/10 rounded border border-amber-400/20 scrapbook-photo">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-12 h-12 text-amber-400/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                </div>
                
                {/* Handwritten-style text lines */}
                <div className="absolute bottom-16 left-8 right-8 space-y-2">
                  <div className="h-px bg-amber-400/20 scrapbook-line" style={{ animationDelay: '0.2s' }} />
                  <div className="h-px bg-amber-400/20 scrapbook-line" style={{ animationDelay: '0.4s' }} />
                  <div className="h-px bg-amber-400/15 w-2/3 scrapbook-line" style={{ animationDelay: '0.6s' }} />
                </div>
                
                {/* Decorative elements */}
                <div className="absolute bottom-4 right-4 text-amber-400/30 text-xs italic">Summer 2024</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* EVA Orb - center, position varies per scene */}
      <div 
        className={`absolute left-1/2 transition-all duration-1000 z-30 ${
          orbVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          top: scenePosition.orbTop,
          transform: `translateX(-50%) scale(${orbScale})`,
        }}
      >
        <EVAOrb 
          size={160} 
          isSpeaking={isAISpeaking}
        />
      </div>
      
      {/* Text display - hide when tutorial phase is active */}
      {/* Position varies per scene to avoid overlapping background visuals */}
      {tutorialPhase === 'none' && (
        <div 
          className={`absolute left-0 right-0 flex justify-center px-8 z-20 transition-all duration-700`}
          style={{ top: scenePosition.textTop }}
        >
          <div className="w-full max-w-2xl text-center">
            <p 
              className="text-white text-2xl md:text-3xl lg:text-4xl font-light leading-relaxed"
              style={{ 
                fontFamily: 'var(--font-crimson), Georgia, serif',
                minHeight: '3em',
              }}
            >
              {displayedText}
              {isTyping && <span className="animate-pulse">|</span>}
            </p>
          </div>
        </div>
      )}
      
      {/* Aurora Wave at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none">
        <AuroraWave 
          isActive={currentSceneIndex >= 0}
          isAISpeaking={isAISpeaking}
          userAudioLevel={0}
        />
      </div>
      
      {/* Name input */}
      {showNameInput && !isTransitioning && tutorialPhase === 'none' && (
        <div className="absolute left-0 right-0 top-[62%] flex justify-center px-8 name-input-appear z-40">
          <form onSubmit={handleNameSubmit} className="flex flex-col items-center gap-6 w-full max-w-md">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name..."
              autoFocus
              className="w-full bg-transparent border-b-2 border-cyan-500/50 focus:border-cyan-400 text-white text-2xl text-center py-4 outline-none placeholder-white/30 transition-colors"
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            />
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Family invite code (optional)"
              className="w-full bg-transparent border-b border-white/20 focus:border-cyan-400/50 text-white/70 text-sm text-center py-2 outline-none placeholder-white/20 transition-colors"
            />
            <button
              type="submit"
              disabled={!userName.trim()}
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-full font-medium tracking-wide hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Begin
            </button>
          </form>
        </div>
      )}
      
      {/* Tutorial flow after name */}
      {tutorialPhase !== 'none' && !isTransitioning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
          {/* Tutorial text */}
          <div className="text-center px-8 max-w-2xl mb-8">
            <p 
              className="text-white text-xl md:text-2xl font-light leading-relaxed"
              style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
            >
              {tutorialText ?? ''}
            </p>
          </div>
          
          {/* Option buttons */}
          {tutorialPhase === 'options' && (
            <div className="flex flex-col sm:flex-row gap-4 mt-8 tutorial-options-appear">
              <button
                onClick={handleStartTutorial}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-full font-medium tracking-wide hover:from-cyan-500 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
              >
                Let&apos;s preserve some memories
              </button>
              <button
                onClick={handleSkipTutorial}
                className="px-8 py-4 bg-white/10 text-white/80 rounded-full font-medium tracking-wide hover:bg-white/20 hover:text-white transition-all"
              >
                I&apos;ll just browse
              </button>
            </div>
          )}
          
          {/* Album name input */}
          {tutorialPhase === 'album-name' && (
            <div className="mt-8 tutorial-options-appear w-full max-w-md">
              <form onSubmit={handleAlbumNameSubmit} className="flex flex-col items-center gap-6">
                <input
                  type="text"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  placeholder="My Memories..."
                  autoFocus
                  className="w-full bg-transparent border-b-2 border-cyan-500/50 focus:border-cyan-400 text-white text-xl text-center py-3 outline-none placeholder-white/30 transition-colors"
                  style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
                />
                <button
                  type="submit"
                  disabled={!albumName.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-full font-medium tracking-wide hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Create Album
                </button>
              </form>
            </div>
          )}
          
          {/* Creating album state */}
          {tutorialPhase === 'creating' && (
            <div className="flex flex-col items-center gap-4 mt-8">
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/60 loading-bar" />
              </div>
              <p className="text-white/60 text-sm">Creating your first album...</p>
            </div>
          )}
        </div>
      )}
      
      {/* Transition overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-black transition-overlay flex items-center justify-center z-[100]">
          <p 
            className="text-white text-2xl font-light transition-text"
            style={{ fontFamily: 'var(--font-crimson), Georgia, serif' }}
          >
            Welcome to Living Memory, {userName}.
          </p>
        </div>
      )}
      
      {/* Skip button - hide during tutorial phase */}
      {currentSceneIndex >= 0 && !showNameInput && !isTransitioning && tutorialPhase === 'none' && (
        <button
          onClick={handleSkip}
          className="absolute bottom-8 right-8 text-white/30 hover:text-white/60 text-sm tracking-wider uppercase transition-colors z-50"
        >
          Skip
        </button>
      )}
      
      {/* Loading state - brief while intro auto-starts */}
      {currentSceneIndex < 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
          {/* Ambient glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-30"
              style={{
                background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(16,185,129,0.1) 40%, transparent 70%)',
                filter: 'blur(80px)',
              }}
            />
          </div>
          
          {/* EVA Orb */}
          <div className="relative mb-6">
            <EVAOrb size={100} isSpeaking={true} />
          </div>
          
          {/* EVA text */}
          <h2 
            className="text-2xl md:text-3xl font-extralight tracking-wide mb-6 bg-clip-text text-transparent"
            style={{ 
              fontFamily: 'var(--font-crimson), Georgia, serif',
              backgroundImage: 'linear-gradient(90deg, #22d3ee, #06b6d4, #10b981)',
            }}
          >
            EVA
          </h2>
          
          {/* Loading bar */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 loading-bar" />
            </div>
            <p className="text-white/40 text-sm tracking-wider">Preparing experience...</p>
          </div>
        </div>
      )}
      
      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/20 rounded-full particle"
            style={{
              left: `${10 + (i * 4.5) % 90}%`,
              top: `${5 + (i * 7) % 95}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${15 + (i % 5) * 2}s`,
            }}
          />
        ))}
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fragmentFade {
          0%, 100% { opacity: 0; transform: rotate(var(--rotation, 0deg)) scale(0.8); }
          20%, 80% { opacity: 0.4; transform: rotate(var(--rotation, 0deg)) scale(1); }
          50% { opacity: 0.6; transform: rotate(var(--rotation, 0deg)) scale(1.05); }
        }
        
        @keyframes scanLine {
          0% { top: 0; }
          100% { top: 100%; }
        }
        
        .scan-line {
          animation: scanLine 2s linear infinite;
        }
        
        @keyframes photoEmerge {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        .photo-emerge {
          animation: photoEmerge 2s ease-out forwards;
        }
        
        .capture-frame {
          animation: photoEmerge 1s ease-out forwards;
        }
        
        @keyframes soundWave {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        
        .sound-wave {
          animation: soundWave 2s ease-out infinite;
        }
        
        @keyframes floatingWord {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-10px); opacity: 0.7; }
        }
        
        .floating-word {
          animation: floatingWord 3s ease-in-out infinite;
        }
        
        @keyframes filmStrip {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .film-strip {
          animation: filmStrip 20s linear infinite;
        }
        
        @keyframes filmFrame {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        
        .film-frame {
          animation: filmFrame 3s ease-in-out infinite;
        }
        
        @keyframes playButton {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .play-button {
          animation: playButton 2s ease-in-out infinite;
        }
        
        @keyframes nameInputAppear {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        .name-input-appear {
          animation: nameInputAppear 0.8s ease-out forwards;
        }
        
        @keyframes tutorialOptionsAppear {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        .tutorial-options-appear {
          animation: tutorialOptionsAppear 0.6s ease-out forwards;
        }
        
        @keyframes transitionOverlay {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        .transition-overlay {
          animation: transitionOverlay 0.5s ease-out forwards;
        }
        
        @keyframes transitionText {
          0% { opacity: 0; transform: translateY(20px); }
          50% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; }
        }
        
        .transition-text {
          animation: transitionText 2s ease-out forwards;
        }
        
        @keyframes loadingBar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        
        .loading-bar {
          animation: loadingBar 3s ease-out forwards;
        }
        
        @keyframes particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.3; }
          90% { opacity: 0.3; }
          100% { transform: translateY(-100vh) translateX(50px); opacity: 0; }
        }
        
        .particle {
          animation: particle 20s linear infinite;
        }
        
        /* Questions scene animations */
        @keyframes gentlePulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.05); }
        }
        
        @keyframes questionBubble {
          0% { opacity: 0; transform: translateY(20px); }
          20% { opacity: 0.7; transform: translateY(0); }
          80% { opacity: 0.7; transform: translateY(-10px); }
          100% { opacity: 0; transform: translateY(-30px); }
        }
        
        .question-bubble {
          animation: questionBubble 4s ease-in-out infinite;
        }
        
        /* Collaboration scene animations */
        @keyframes povQuote {
          0% { opacity: 0; transform: scale(0.9); }
          30%, 70% { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.95); }
        }
        
        .pov-quote {
          animation: povQuote 5s ease-in-out infinite;
        }
        
        @keyframes connectionLine {
          0% { opacity: 0; width: 0; }
          50% { opacity: 0.3; width: 60px; }
          100% { opacity: 0; width: 80px; }
        }
        
        .connection-line {
          animation: connectionLine 3s ease-in-out infinite;
        }
        
        /* Scrapbook scene animations */
        @keyframes scrapbookPage {
          0% { opacity: 0; transform: scale(0.9) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        
        .scrapbook-page {
          animation: scrapbookPage 1s ease-out forwards;
        }
        
        @keyframes scrapbookPhoto {
          0%, 100% { transform: translateX(-50%) scale(1) rotate(0deg); }
          50% { transform: translateX(-50%) scale(1.02) rotate(0.5deg); }
        }
        
        .scrapbook-photo {
          animation: scrapbookPhoto 4s ease-in-out infinite;
        }
        
        @keyframes scrapbookLine {
          0% { width: 0; opacity: 0; }
          100% { width: 100%; opacity: 1; }
        }
        
        .scrapbook-line {
          animation: scrapbookLine 0.8s ease-out forwards;
        }
      `}</style>
    </main>
  );
}
