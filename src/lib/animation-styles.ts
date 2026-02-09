/**
 * Animation style definitions used across the app.
 *
 * Styles that need visual transformation (Disney, etc.) go through:
 *   1. Style-transfer the image (Nano Banana / Gemini)
 *   2. Animate the stylized image with VEO 3 / Grok
 *
 * The image is already generated before animation — prompts stay simple.
 */

export interface AnimationStyle {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Whether the photo needs to be visually transformed before animation */
  needsStyleTransfer: boolean;
  /** Prompt sent to Gemini image generation to transform the photo's look */
  styleTransferPrompt: string;
  /** Prompt for animation — image is already styled, just animate it */
  motionPrompt: string;
  /** If true, style is shown but greyed out / not selectable */
  disabled?: boolean;
}

export const ANIMATION_STYLES: AnimationStyle[] = [
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Natural, film-like motion',
    icon: '🎬',
    needsStyleTransfer: false,
    styleTransferPrompt: '',
    motionPrompt: 'Bring this photo to life with subtle, natural motion. Keep faces stable.',
  },
  {
    id: 'disney',
    label: 'Disney',
    description: 'Classic Disney cartoon',
    icon: '✨',
    needsStyleTransfer: true,
    styleTransferPrompt:
      'Transform this photograph into a 3D computer-animated Pixar/Disney CGI style (like Coco, Soul, Encanto, or Tangled). Re-render every person, object, and background as fully 3D volumetric characters and scenery with sculpted depth, soft subsurface scattering on skin, rich ambient occlusion, and cinematic three-point lighting. Keep the exact same people, poses, expressions, composition, and setting — only change the visual style to modern 3D animation. The result must look like a frame from a Disney/Pixar 3D animated film, not flat or 2D.',
    motionPrompt: 'Animate this image with gentle, magical motion. Keep faces stable.',
  },
  {
    id: 'ghibli',
    label: 'Ghibli',
    description: 'Studio Ghibli hand-drawn',
    icon: '🍃',
    needsStyleTransfer: true,
    styleTransferPrompt:
      'Transform this photograph into the art style of a Studio Ghibli animated film (like Spirited Away, My Neighbor Totoro, or Howl\'s Moving Castle). Re-render everything in Ghibli\'s distinctive hand-painted watercolor style with soft lines, gentle pastel colors, and intricate background detail. Keep the same people, poses, expressions, and composition. Make the scene feel peaceful and contemplative with Ghibli\'s signature naturalistic beauty. Visible brush-stroke texture, soft ambient lighting.',
    motionPrompt: 'Animate this image with gentle, serene motion. Keep faces stable.',
    disabled: true,
  },
  {
    id: 'anime',
    label: 'Anime',
    description: 'Japanese anime style',
    icon: '⚡',
    needsStyleTransfer: true,
    styleTransferPrompt:
      'Transform this photograph into a high-quality Japanese anime art style (like Makoto Shinkai\'s Your Name or Weathering With You). Re-render all people and scenery in anime style with clean sharp lines, vibrant saturated colors, dramatic lighting with lens flares, and detailed backgrounds. Keep the same people, poses, expressions, and composition. Eyes should be larger and more expressive in anime proportion. Rich color palette with dramatic sky and lighting effects.',
    motionPrompt: 'Animate this image with dynamic motion. Keep faces stable.',
    disabled: true,
  },
];

/**
 * Get an animation style by ID. Falls back to 'cinematic' if not found.
 */
export function getAnimationStyle(id: string): AnimationStyle {
  return ANIMATION_STYLES.find((s) => s.id === id) || ANIMATION_STYLES[0];
}

/**
 * Build the animation (motion) prompt from a style and optional story text.
 */
export function buildAnimationPrompt(styleId: string, storyText?: string): string {
  const style = getAnimationStyle(styleId);
  if (storyText) {
    return `${style.motionPrompt} The photo shows: ${storyText}`;
  }
  return style.motionPrompt;
}
