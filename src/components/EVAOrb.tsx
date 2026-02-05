'use client';

import { useRef, useEffect, useState } from 'react';

interface EVAOrbProps {
  onClick?: () => void;
  size?: number;
  className?: string;
  isSpeaking?: boolean;
}

/**
 * EVA - The AI companion orb
 * Ethereal atom-style with 3D orbital rings and aurora effects
 */
export default function EVAOrb({ onClick, size = 96, className = '', isSpeaking = false }: EVAOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Combined active state (hover or speaking)
  const isActive = isHovered || isSpeaking;
  
  // Use ref to ensure animation always reads current active state
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

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
    const orbits = [
      // Main prominent rings
      { 
        radiusX: size * 0.42, 
        radiusY: size * 0.16,
        tiltX: -0.2,
        tiltY: 0.1,
        rotation: -Math.PI * 0.1,
        speed: 0.3,
        colors: [[6, 182, 212], [16, 185, 129]], // cyan to emerald
        width: 2.5,
      },
      { 
        radiusX: size * 0.40, 
        radiusY: size * 0.14,
        tiltX: 0.5,
        tiltY: 0.3,
        rotation: Math.PI * 0.45,
        speed: 0.4,
        colors: [[59, 130, 246], [139, 92, 246]], // blue to purple
        width: 2.2,
      },
      { 
        radiusX: size * 0.44, 
        radiusY: size * 0.12,
        tiltX: 0.1,
        tiltY: -0.4,
        rotation: Math.PI * 0.85,
        speed: 0.35,
        colors: [[16, 185, 129], [6, 182, 212]], // emerald to cyan
        width: 2.0,
      },
      // Additional rings for fuller orb appearance
      { 
        radiusX: size * 0.38, 
        radiusY: size * 0.18,
        tiltX: 0.3,
        tiltY: -0.2,
        rotation: Math.PI * 0.25,
        speed: 0.28,
        colors: [[139, 92, 246], [59, 130, 246]], // purple to blue
        width: 1.8,
      },
      { 
        radiusX: size * 0.41, 
        radiusY: size * 0.13,
        tiltX: -0.4,
        tiltY: 0.5,
        rotation: Math.PI * 0.65,
        speed: 0.32,
        colors: [[6, 182, 212], [139, 92, 246]], // cyan to purple
        width: 1.6,
      },
      { 
        radiusX: size * 0.36, 
        radiusY: size * 0.20,
        tiltX: 0.6,
        tiltY: 0.1,
        rotation: Math.PI * 0.0,
        speed: 0.38,
        colors: [[16, 185, 129], [59, 130, 246]], // emerald to blue
        width: 1.5,
      },
      { 
        radiusX: size * 0.43, 
        radiusY: size * 0.10,
        tiltX: -0.1,
        tiltY: -0.6,
        rotation: Math.PI * 1.1,
        speed: 0.25,
        colors: [[59, 130, 246], [6, 182, 212]], // blue to cyan
        width: 1.4,
      },
      { 
        radiusX: size * 0.39, 
        radiusY: size * 0.15,
        tiltX: 0.4,
        tiltY: 0.4,
        rotation: Math.PI * 0.55,
        speed: 0.42,
        colors: [[139, 92, 246], [16, 185, 129]], // purple to emerald
        width: 1.3,
      },
      { 
        radiusX: size * 0.37, 
        radiusY: size * 0.17,
        tiltX: -0.5,
        tiltY: -0.3,
        rotation: Math.PI * 0.15,
        speed: 0.33,
        colors: [[6, 182, 212], [139, 92, 246]], // cyan to purple
        width: 1.2,
      },
      { 
        radiusX: size * 0.45, 
        radiusY: size * 0.11,
        tiltX: 0.2,
        tiltY: -0.5,
        rotation: Math.PI * 0.72,
        speed: 0.29,
        colors: [[16, 185, 129], [139, 92, 246]], // emerald to purple
        width: 1.2,
      },
      { 
        radiusX: size * 0.35, 
        radiusY: size * 0.22,
        tiltX: -0.3,
        tiltY: 0.6,
        rotation: Math.PI * 0.38,
        speed: 0.36,
        colors: [[59, 130, 246], [6, 182, 212]], // blue to cyan
        width: 1.1,
      },
      { 
        radiusX: size * 0.40, 
        radiusY: size * 0.14,
        tiltX: 0.55,
        tiltY: -0.35,
        rotation: Math.PI * 0.92,
        speed: 0.31,
        colors: [[139, 92, 246], [6, 182, 212]], // purple to cyan
        width: 1.1,
      },
      { 
        radiusX: size * 0.38, 
        radiusY: size * 0.16,
        tiltX: -0.6,
        tiltY: 0.2,
        rotation: Math.PI * 0.18,
        speed: 0.27,
        colors: [[16, 185, 129], [59, 130, 246]], // emerald to blue
        width: 1.0,
      },
    ];

    const animate = () => {
      if (!ctx || !canvas) return;

      // Read from ref to get current value (not stale closure)
      const active = isActiveRef.current;
      const speed = active ? 2 : 1;
      timeRef.current += 0.04 * speed;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      // Ambient glow layers
      const glowSize = size * 0.5;
      const ambientGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowSize);
      ambientGlow.addColorStop(0, `rgba(6, 182, 212, ${active ? 0.2 : 0.1})`);
      ambientGlow.addColorStop(0.4, `rgba(59, 130, 246, ${active ? 0.12 : 0.06})`);
      ambientGlow.addColorStop(0.7, `rgba(139, 92, 246, ${active ? 0.06 : 0.03})`);
      ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
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
            
            // Color blend along the ring
            const colorBlend = (Math.sin(angle1 + t) + 1) / 2;
            const c1 = orbit.colors[0];
            const c2 = orbit.colors[1];
            const r = Math.round(c1[0] + (c2[0] - c1[0]) * colorBlend);
            const g = Math.round(c1[1] + (c2[1] - c1[1]) * colorBlend);
            const b = Math.round(c1[2] + (c2[2] - c1[2]) * colorBlend);
            
            const alpha = waveMod * depthAlpha * pass.alpha * (active ? 1 : 0.8);
            const lineWidth = orbit.width * pass.widthMult * (0.5 + waveMod * 0.5);
            
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
          const spotIntensity = (0.5 + depth * 0.5) * (active ? 1.2 : 0.8);
          
          const spotGlow = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, size * 0.06);
          spotGlow.addColorStop(0, `rgba(255, 255, 255, ${0.8 * spotIntensity})`);
          spotGlow.addColorStop(0.3, `rgba(${orbit.colors[0][0]}, ${orbit.colors[0][1]}, ${orbit.colors[0][2]}, ${0.5 * spotIntensity})`);
          spotGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.beginPath();
          ctx.arc(spotX, spotY, size * 0.06, 0, Math.PI * 2);
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
      const outerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulsedRadius * 3.5);
      outerGlow.addColorStop(0, `rgba(6, 182, 212, ${active ? 0.5 : 0.35})`);
      outerGlow.addColorStop(0.3, `rgba(59, 130, 246, ${active ? 0.3 : 0.2})`);
      outerGlow.addColorStop(0.6, `rgba(139, 92, 246, ${active ? 0.15 : 0.08})`);
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulsedRadius * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // Inner glow
      const innerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulsedRadius * 2);
      innerGlow.addColorStop(0, `rgba(255, 255, 255, ${active ? 0.6 : 0.4})`);
      innerGlow.addColorStop(0.5, `rgba(6, 182, 212, ${active ? 0.5 : 0.35})`);
      innerGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulsedRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = innerGlow;
      ctx.fill();

      // 3D sphere with lighting
      const lightX = -pulsedRadius * 0.35;
      const lightY = -pulsedRadius * 0.35;
      
      const sphereGradient = ctx.createRadialGradient(
        centerX + lightX, centerY + lightY, 0,
        centerX, centerY, pulsedRadius
      );
      sphereGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      sphereGradient.addColorStop(0.2, 'rgba(200, 255, 255, 0.95)');
      sphereGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.9)');
      sphereGradient.addColorStop(0.8, 'rgba(59, 130, 246, 0.85)');
      sphereGradient.addColorStop(1, 'rgba(99, 102, 241, 0.8)');
      
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
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="absolute inset-0"
      />
    </button>
  );
}
