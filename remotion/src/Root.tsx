import { Composition, Sequence, AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { HookScene } from './compositions/HookScene';
import { IntroScene } from './compositions/IntroScene';
import { CaptureScene } from './compositions/CaptureScene';
import { EnhanceAnimateScene } from './compositions/EnhanceAnimateScene';
import { NarrateScene } from './compositions/NarrateScene';
import { ExperienceScene } from './compositions/ExperienceScene';
import { TechStackScene } from './compositions/TechStackScene';
import { OutroScene } from './compositions/OutroScene';

const FPS = 30;
const TRANSITION = 20; // cross-fade frames — slower for premium feel

// Scene durations — longer to let things breathe
const D = {
  hook: 300,     // 10s - cinematic photo montage
  intro: 180,    // 6s - slow, confident
  capture: 210,  // 7s - let the device settle
  enhance: 300,  // 10s (enhance + animate)
  narrate: 220,  // 7.3s - waveform needs time
  experience: 200, // 6.7s - devices fanning out
  tech: 200,     // 6.7s - orbiting needs room
  outro: 160,    // 5.3s - confident close
};

const SCENES = ['hook', 'intro', 'capture', 'enhance', 'narrate', 'experience', 'tech', 'outro'] as const;
const DURATIONS = SCENES.map(s => D[s]);

// Calculate start frames with cross-fade overlaps
function getStarts() {
  const starts: number[] = [0];
  for (let i = 1; i < SCENES.length; i++) {
    starts.push(starts[i - 1] + DURATIONS[i - 1] - TRANSITION);
  }
  return starts;
}

const STARTS = getStarts();
const TOTAL = STARTS[STARTS.length - 1] + DURATIONS[DURATIONS.length - 1];

const COMPONENTS = [HookScene, IntroScene, CaptureScene, EnhanceAnimateScene, NarrateScene, ExperienceScene, TechStackScene, OutroScene];

// Full showcase
const ShowcaseVideo: React.FC = () => {
  const frame = useCurrentFrame();

  const sceneOpacity = (idx: number) => {
    const start = STARTS[idx];
    const duration = DURATIONS[idx];
    const local = frame - start;
    if (local < 0 || local > duration) return 0;
    const fadeIn = idx === 0
      ? 1
      : interpolate(local, [0, TRANSITION], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const fadeOut = interpolate(local, [duration - TRANSITION, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return Math.min(fadeIn, fadeOut);
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {SCENES.map((_, i) => {
        const Component = COMPONENTS[i];
        return (
          <Sequence key={i} from={STARTS[i]} durationInFrames={DURATIONS[i]}>
            <AbsoluteFill style={{ opacity: sceneOpacity(i) }}>
              <Component />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="ShowcaseVideo" component={ShowcaseVideo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />

      {/* Individual scenes */}
      <Composition id="HookScene" component={HookScene} durationInFrames={D.hook} fps={FPS} width={1920} height={1080} />
      <Composition id="IntroScene" component={IntroScene} durationInFrames={D.intro} fps={FPS} width={1920} height={1080} />
      <Composition id="CaptureScene" component={CaptureScene} durationInFrames={D.capture} fps={FPS} width={1920} height={1080} />
      <Composition id="EnhanceAnimateScene" component={EnhanceAnimateScene} durationInFrames={D.enhance} fps={FPS} width={1920} height={1080} />
      <Composition id="NarrateScene" component={NarrateScene} durationInFrames={D.narrate} fps={FPS} width={1920} height={1080} />
      <Composition id="ExperienceScene" component={ExperienceScene} durationInFrames={D.experience} fps={FPS} width={1920} height={1080} />
      <Composition id="TechStackScene" component={TechStackScene} durationInFrames={D.tech} fps={FPS} width={1920} height={1080} />
      <Composition id="OutroScene" component={OutroScene} durationInFrames={D.outro} fps={FPS} width={1920} height={1080} />
    </>
  );
};
