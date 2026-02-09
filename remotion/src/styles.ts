// Shared design tokens — Apple-level premium
export const COLORS = {
  bg: '#050507',
  bgLight: '#0c0c10',
  bgCard: 'rgba(18,18,24,0.85)',
  white: '#ffffff',
  white90: 'rgba(255,255,255,0.88)',
  white70: 'rgba(255,255,255,0.65)',
  white50: 'rgba(255,255,255,0.45)',
  white30: 'rgba(255,255,255,0.25)',
  white15: 'rgba(255,255,255,0.12)',
  white06: 'rgba(255,255,255,0.05)',
  cyan: '#06b6d4',
  cyanLight: '#67e8f9',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  teal: '#14b8a6',
  green: '#22c55e',
  amber: '#f59e0b',
  pink: '#ec4899',
  red: '#ef4444',
  orange: '#f97316',
};

export const FONTS = {
  serif: '"SF Pro Display", "Crimson Pro", Georgia, serif',
  sans: '"SF Pro Text", "Inter", system-ui, -apple-system, sans-serif',
  mono: '"SF Mono", "JetBrains Mono", monospace',
};

// Apple-style spring configs
export const SPRINGS = {
  // Very slow, deliberate entrance — the signature Apple feel
  slow: { damping: 200, stiffness: 15, mass: 1.5 },
  // Medium — for secondary elements
  medium: { damping: 100, stiffness: 25, mass: 1 },
  // Gentle pop — for small accents
  gentle: { damping: 30, stiffness: 40, mass: 0.8 },
};

// Layered shadow for depth (tight + diffuse)
export function premiumShadow(color = '0,0,0', intensity = 1) {
  return [
    `0 1px 2px rgba(${color}, ${0.15 * intensity})`,
    `0 4px 8px rgba(${color}, ${0.12 * intensity})`,
    `0 16px 32px rgba(${color}, ${0.14 * intensity})`,
    `0 48px 96px rgba(${color}, ${0.18 * intensity})`,
  ].join(', ');
}

// Glass reflection gradient overlay
export function glassReflection(angle = 135) {
  return `linear-gradient(${angle}deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)`;
}
