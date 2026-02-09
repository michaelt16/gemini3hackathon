'use client';

import { useRef, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface EVAOrbProps {
  onClick?: () => void;
  size?: number;
  className?: string;
  isSpeaking?: boolean;
  showRipple?: boolean;
}

/**
 * EVA - The AI companion orb
 * Ethereal atom-style with 3D orbital rings and aurora effects
 */
export default function EVAOrb({ onClick, size = 96, className = '', isSpeaking = false, showRipple = true }: EVAOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);
  
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Combined active state (hover or speaking)
  const isActive = isHovered || isSpeaking;
  
  // Use refs so animation loop reads current values without re-creating
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;

    // 3D orbital rings with different tilts - many rings to form an orb
    // Dark palette: cyan/blue/purple/emerald (glow on dark bg)
    // Light palette: soft sky blues with subtle blue-purple accents (clean on cream)
    const orbits = [
      // Main prominent rings
      { 
        radiusX: size * 0.42, radiusY: size * 0.16, tiltX: -0.2, tiltY: 0.1,
        rotation: -Math.PI * 0.1, speed: 0.3, width: 2.5,
        colors: [[6, 182, 212], [16, 185, 129]] as number[][],          // dark: cyan→emerald
        lightColors: [[95, 155, 85], [40, 150, 155]] as number[][],     // light: sage→teal
      },
      { 
        radiusX: size * 0.40, radiusY: size * 0.14, tiltX: 0.5, tiltY: 0.3,
        rotation: Math.PI * 0.45, speed: 0.4, width: 2.2,
        colors: [[59, 130, 246], [139, 92, 246]] as number[][],         // dark: blue→purple
        lightColors: [[30, 140, 150], [55, 160, 165]] as number[][],    // light: deep teal→ocean
      },
      { 
        radiusX: size * 0.44, radiusY: size * 0.12, tiltX: 0.1, tiltY: -0.4,
        rotation: Math.PI * 0.85, speed: 0.35, width: 2.0,
        colors: [[16, 185, 129], [6, 182, 212]] as number[][],          // dark: emerald→cyan
        lightColors: [[110, 160, 70], [65, 148, 130]] as number[][],    // light: olive→seafoam
      },
      { 
        radiusX: size * 0.38, radiusY: size * 0.18, tiltX: 0.3, tiltY: -0.2,
        rotation: Math.PI * 0.25, speed: 0.28, width: 1.8,
        colors: [[139, 92, 246], [59, 130, 246]] as number[][],
        lightColors: [[35, 145, 148], [85, 155, 90]] as number[][],     // light: teal→sage
      },
      { 
        radiusX: size * 0.41, radiusY: size * 0.13, tiltX: -0.4, tiltY: 0.5,
        rotation: Math.PI * 0.65, speed: 0.32, width: 1.6,
        colors: [[6, 182, 212], [139, 92, 246]] as number[][],
        lightColors: [[100, 162, 80], [42, 148, 152]] as number[][],    // light: spring→teal
      },
      { 
        radiusX: size * 0.36, radiusY: size * 0.20, tiltX: 0.6, tiltY: 0.1,
        rotation: Math.PI * 0.0, speed: 0.38, width: 1.5,
        colors: [[16, 185, 129], [59, 130, 246]] as number[][],
        lightColors: [[45, 152, 145], [105, 158, 75]] as number[][],    // light: warm teal→lime sage
      },
      { 
        radiusX: size * 0.43, radiusY: size * 0.10, tiltX: -0.1, tiltY: -0.6,
        rotation: Math.PI * 1.1, speed: 0.25, width: 1.4,
        colors: [[59, 130, 246], [6, 182, 212]] as number[][],
        lightColors: [[88, 152, 88], [38, 142, 155]] as number[][],     // light: forest→deep teal
      },
      { 
        radiusX: size * 0.39, radiusY: size * 0.15, tiltX: 0.4, tiltY: 0.4,
        rotation: Math.PI * 0.55, speed: 0.42, width: 1.3,
        colors: [[139, 92, 246], [16, 185, 129]] as number[][],
        lightColors: [[50, 155, 158], [72, 145, 108]] as number[][],    // light: cyan teal→mint
      },
      { 
        radiusX: size * 0.37, radiusY: size * 0.17, tiltX: -0.5, tiltY: -0.3,
        rotation: Math.PI * 0.15, speed: 0.33, width: 1.2,
        colors: [[6, 182, 212], [139, 92, 246]] as number[][],
        lightColors: [[60, 145, 140], [95, 155, 82]] as number[][],     // light: pine teal→olive
      },
      { 
        radiusX: size * 0.45, radiusY: size * 0.11, tiltX: 0.2, tiltY: -0.5,
        rotation: Math.PI * 0.72, speed: 0.29, width: 1.2,
        colors: [[16, 185, 129], [139, 92, 246]] as number[][],
        lightColors: [[82, 150, 95], [48, 150, 152]] as number[][],     // light: clover→aqua teal
      },
      { 
        radiusX: size * 0.35, radiusY: size * 0.22, tiltX: -0.3, tiltY: 0.6,
        rotation: Math.PI * 0.38, speed: 0.36, width: 1.1,
        colors: [[59, 130, 246], [6, 182, 212]] as number[][],
        lightColors: [[35, 148, 150], [90, 155, 85]] as number[][],     // light: teal→fern
      },
      { 
        radiusX: size * 0.40, radiusY: size * 0.14, tiltX: 0.55, tiltY: -0.35,
        rotation: Math.PI * 0.92, speed: 0.31, width: 1.1,
        colors: [[139, 92, 246], [6, 182, 212]] as number[][],
        lightColors: [[68, 144, 110], [55, 155, 155]] as number[][],    // light: jade→ocean teal
      },
      { 
        radiusX: size * 0.38, radiusY: size * 0.16, tiltX: -0.6, tiltY: 0.2,
        rotation: Math.PI * 0.18, speed: 0.27, width: 1.0,
        colors: [[16, 185, 129], [59, 130, 246]] as number[][],
        lightColors: [[42, 148, 148], [112, 162, 68]] as number[][],    // light: teal→spring green
      },
    ];

    const animate = () => {
      if (!ctx || !canvas) return;

      // Read from ref to get current value (not stale closure)
      const active = isActiveRef.current;
      const dark = isDarkRef.current;
      const speed = active ? 2 : 1;
      timeRef.current += 0.04 * speed;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      // Ambient glow
      const glowSize = size * 0.5;
      const ambientGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowSize);
      if (dark) {
        ambientGlow.addColorStop(0, `rgba(6, 182, 212, ${active ? 0.2 : 0.1})`);
        ambientGlow.addColorStop(0.4, `rgba(59, 130, 246, ${active ? 0.12 : 0.06})`);
        ambientGlow.addColorStop(0.7, `rgba(139, 92, 246, ${active ? 0.06 : 0.03})`);
        ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        // Light mode: sage green + teal mixed glow on cream
        ambientGlow.addColorStop(0, `rgba(65, 148, 130, ${active ? 0.22 : 0.12})`);
        ambientGlow.addColorStop(0.4, `rgba(85, 150, 95, ${active ? 0.12 : 0.06})`);
        ambientGlow.addColorStop(0.7, `rgba(45, 145, 145, ${active ? 0.05 : 0.02})`);
        ambientGlow.addColorStop(1, 'rgba(45, 145, 145, 0)');
      }
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, size, size);

      // Draw orbital rings with 3D effect and aurora gradient
      orbits.forEach((orbit, orbitIndex) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // 3D rotation animation
        const rotationOffset = t * orbit.speed;
        ctx.rotate(orbit.rotation + rotationOffset * (active ? 1.4 : 1));

        // Draw multiple passes for glow + core
        const passes = [
          { blur: 8, alpha: 0.3, widthMult: 3 },
          { blur: 4, alpha: 0.5, widthMult: 2 },
          { blur: 0, alpha: 1, widthMult: 1 },
        ];

        passes.forEach(pass => {
          const segments = 100;
          
          for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2;
            const angle2 = ((i + 1) / segments) * Math.PI * 2;
            
            // Aurora wave modulation
            const wave1 = Math.sin(angle1 * 2 + t * 2 + orbitIndex) * 0.5 + 0.5;
            const wave2 = Math.sin(angle1 * 4 + t * 3 + orbitIndex * 0.7) * 0.3 + 0.7;
            const wave3 = Math.sin(angle1 * 1.5 + t * 1.5) * 0.2 + 0.8;
            const waveMod = wave1 * wave2 * wave3;
            
            // 3D depth - vary opacity based on "depth" (using sine of angle)
            const depth = Math.sin(angle1 + orbit.tiltX) * 0.5 + 0.5;
            const depthAlpha = 0.4 + depth * 0.6;
            
            // Calculate ellipse points with 3D perspective
            const perspectiveScale = 1 + Math.sin(angle1 + t * orbit.speed) * orbit.tiltY * 0.2;
            const x1 = Math.cos(angle1) * orbit.radiusX * perspectiveScale;
            const y1 = Math.sin(angle1) * orbit.radiusY * perspectiveScale;
            const x2 = Math.cos(angle2) * orbit.radiusX * perspectiveScale;
            const y2 = Math.sin(angle2) * orbit.radiusY * perspectiveScale;
            
            // Color blend along the ring — pick light or dark palette
            const colorBlend = (Math.sin(angle1 + t) + 1) / 2;
            const palette = dark ? orbit.colors : orbit.lightColors;
            const c1 = palette[0];
            const c2 = palette[1];
            const r = Math.round(c1[0] + (c2[0] - c1[0]) * colorBlend);
            const g = Math.round(c1[1] + (c2[1] - c1[1]) * colorBlend);
            const b = Math.round(c1[2] + (c2[2] - c1[2]) * colorBlend);
            
            // Light mode: more opaque and thicker so the earthy colors pop on cream
            const themeAlpha = dark ? 1 : 1.8;
            const alpha = Math.min(1, waveMod * depthAlpha * pass.alpha * (active ? 1 : 0.85) * themeAlpha);
            const lineWidth = orbit.width * pass.widthMult * (0.5 + waveMod * 0.5) * (dark ? 1 : 1.4);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        });

        // Draw bright spots that travel along the ring
        const numSpots = 2;
        for (let i = 0; i < numSpots; i++) {
          const spotAngle = t * orbit.speed * 2 + (i * Math.PI);
          const perspectiveScale = 1 + Math.sin(spotAngle + t * orbit.speed) * orbit.tiltY * 0.2;
          const spotX = Math.cos(spotAngle) * orbit.radiusX * perspectiveScale;
          const spotY = Math.sin(spotAngle) * orbit.radiusY * perspectiveScale;
          
          const depth = Math.sin(spotAngle + orbit.tiltX) * 0.5 + 0.5;
          const spotIntensity = (0.5 + depth * 0.5) * (active ? 1.2 : 0.8) * (dark ? 1 : 1.4);
          const spotSize = size * 0.06;
          const spotPalette = dark ? orbit.colors : orbit.lightColors;
          
          const spotGlow = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotSize);
          spotGlow.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, 0.8 * spotIntensity)})`);
          spotGlow.addColorStop(0.3, `rgba(${spotPalette[0][0]}, ${spotPalette[0][1]}, ${spotPalette[0][2]}, ${Math.min(1, 0.5 * spotIntensity)})`);
          spotGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.beginPath();
          ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
          ctx.fillStyle = spotGlow;
          ctx.fill();
        }

        ctx.restore();
      });

      // Central nucleus - 3D sphere
      const nucleusRadius = size * 0.11;
      const pulse = 1 + Math.sin(t * 2.5) * 0.08 + (active ? 0.05 : 0);
      const pulsedRadius = nucleusRadius * pulse;

      // Nucleus outer glow
      const outerGlowRadius = pulsedRadius * (dark ? 3.5 : 4);
      const outerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerGlowRadius);
      if (dark) {
        outerGlow.addColorStop(0, `rgba(6, 182, 212, ${active ? 0.5 : 0.35})`);
        outerGlow.addColorStop(0.3, `rgba(59, 130, 246, ${active ? 0.3 : 0.2})`);
        outerGlow.addColorStop(0.6, `rgba(139, 92, 246, ${active ? 0.15 : 0.08})`);
      } else {
        // Light mode: EVA blue nucleus glow with earthy teal edge
        outerGlow.addColorStop(0, `rgba(6, 162, 212, ${active ? 0.48 : 0.32})`);
        outerGlow.addColorStop(0.3, `rgba(50, 140, 200, ${active ? 0.28 : 0.16})`);
        outerGlow.addColorStop(0.6, `rgba(55, 148, 135, ${active ? 0.10 : 0.05})`);
      }
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerGlowRadius, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // Inner glow
      const innerGlowRadius = pulsedRadius * (dark ? 2 : 2.5);
      const innerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, innerGlowRadius);
      if (dark) {
        innerGlow.addColorStop(0, `rgba(255, 255, 255, ${active ? 0.6 : 0.4})`);
        innerGlow.addColorStop(0.5, `rgba(6, 182, 212, ${active ? 0.5 : 0.35})`);
      } else {
        // Light mode: white center fading to EVA cyan-blue
        innerGlow.addColorStop(0, `rgba(255, 255, 255, ${active ? 0.85 : 0.65})`);
        innerGlow.addColorStop(0.5, `rgba(6, 172, 212, ${active ? 0.55 : 0.35})`);
      }
      innerGlow.addColorStop(1, dark ? 'rgba(6, 182, 212, 0)' : 'rgba(6, 172, 212, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerGlowRadius, 0, Math.PI * 2);
      ctx.fillStyle = innerGlow;
      ctx.fill();

      // 3D sphere with lighting
      const lightX = -pulsedRadius * 0.35;
      const lightY = -pulsedRadius * 0.35;
      
      const sphereGradient = ctx.createRadialGradient(
        centerX + lightX, centerY + lightY, 0,
        centerX, centerY, pulsedRadius
      );
      if (dark) {
        sphereGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        sphereGradient.addColorStop(0.2, 'rgba(200, 255, 255, 0.95)');
        sphereGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.9)');
        sphereGradient.addColorStop(0.8, 'rgba(59, 130, 246, 0.85)');
        sphereGradient.addColorStop(1, 'rgba(99, 102, 241, 0.8)');
      } else {
        // Light mode: white→ice blue→EVA cyan-blue core (stays blue = EVA identity)
        sphereGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        sphereGradient.addColorStop(0.2, 'rgba(200, 235, 250, 1)');
        sphereGradient.addColorStop(0.5, 'rgba(6, 172, 212, 0.92)');
        sphereGradient.addColorStop(0.8, 'rgba(50, 135, 210, 0.88)');
        sphereGradient.addColorStop(1, 'rgba(59, 120, 200, 0.82)');
      }
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulsedRadius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGradient;
      ctx.fill();

      // Specular highlight
      ctx.beginPath();
      ctx.arc(centerX + lightX * 0.7, centerY + lightY * 0.7, pulsedRadius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();

      // Secondary highlight
      ctx.beginPath();
      ctx.arc(centerX + lightX * 0.4, centerY + lightY * 0.4, pulsedRadius * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [size]); // Animation reads isActive from ref, no need to restart on state change

  // Ripple ring sizes based on orb size
  const rippleSize1 = size * 1.4;
  const rippleSize2 = size * 1.7;
  const rippleSize3 = size * 2.0;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative cursor-pointer transition-transform duration-300 ${
        isActive ? 'scale-110' : 'scale-100'
      } ${className}`}
      style={{ width: size, height: size }}
      aria-label="Open EVA - Add Memory"
      title="Add Memory with EVA"
    >
      {/* Ripple rings */}
      {showRipple && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className="absolute rounded-full animate-eva-ripple-1"
            style={{ 
              width: rippleSize1, height: rippleSize1,
              border: isDark ? '1px solid rgba(34,211,238,0.3)' : '1.5px solid rgba(55,148,135,0.30)',
            }}
          />
          <div 
            className="absolute rounded-full animate-eva-ripple-2"
            style={{ 
              width: rippleSize2, height: rippleSize2,
              border: isDark ? '1px solid rgba(34,211,238,0.2)' : '1px solid rgba(55,148,135,0.20)',
            }}
          />
          <div 
            className="absolute rounded-full animate-eva-ripple-3"
            style={{ 
              width: rippleSize3, height: rippleSize3,
              border: isDark ? '1px solid rgba(34,211,238,0.1)' : '1px solid rgba(55,148,135,0.12)',
            }}
          />
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, position: 'relative', zIndex: 1 }}
        className="absolute inset-0"
      />
      
      {/* Global ripple animation styles */}
      <style jsx global>{`
        @keyframes eva-ripple {
          0% {
            transform: scale(0.8);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }
        .animate-eva-ripple-1 {
          animation: eva-ripple 3s ease-out infinite;
        }
        .animate-eva-ripple-2 {
          animation: eva-ripple 3s ease-out infinite;
          animation-delay: 0.5s;
        }
        .animate-eva-ripple-3 {
          animation: eva-ripple 3s ease-out infinite;
          animation-delay: 1s;
        }
      `}</style>
    </button>
  );
}
