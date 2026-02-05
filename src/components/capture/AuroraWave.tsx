'use client';

import { useRef, useEffect } from 'react';

interface AuroraWaveProps {
  isActive: boolean;
  isAISpeaking: boolean;
  userAudioLevel: number;
}

export function AuroraWave({ isActive, isAISpeaking, userAudioLevel }: AuroraWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const animate = () => {
      if (!ctx || !canvas) return;
      
      timeRef.current += 0.02;
      const t = timeRef.current;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerY = canvas.height * 0.5;
      
      // Base amplitude when idle
      let baseAmplitude = 15;
      
      // React to AI speaking
      if (isAISpeaking) {
        baseAmplitude = 80 + Math.sin(t * 5) * 20;
      }
      // React to user speaking (audio level)
      else if (userAudioLevel > 0.1) {
        baseAmplitude = 60 + (userAudioLevel * 40);
      }
      // Subtle movement when mic is active but quiet
      else if (isActive) {
        baseAmplitude = 25 + Math.sin(t * 2) * 10;
      }
      
      const amplitude = baseAmplitude;
      
      // Draw multiple layered waves for aurora effect
      const layers = [
        { color: 'rgba(59, 130, 246, 0.3)', offset: 0, speed: 1 },
        { color: 'rgba(16, 185, 129, 0.4)', offset: 0.5, speed: 1.2 },
        { color: 'rgba(139, 92, 246, 0.3)', offset: 1, speed: 0.8 },
        { color: 'rgba(6, 182, 212, 0.5)', offset: 1.5, speed: 1.5 },
      ];
      
      layers.forEach(layer => {
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        
        for (let x = 0; x <= canvas.width; x += 2) {
          const normalizedX = x / canvas.width;
          
          const wave1 = Math.sin((normalizedX * 4 + t * layer.speed + layer.offset) * Math.PI) * amplitude;
          const wave2 = Math.sin((normalizedX * 6 + t * layer.speed * 0.7 + layer.offset) * Math.PI) * amplitude * 0.5;
          const wave3 = Math.sin((normalizedX * 2 + t * layer.speed * 1.3 + layer.offset) * Math.PI) * amplitude * 0.3;
          
          let noise = 0;
          if (isAISpeaking) {
            noise = (Math.random() - 0.5) * 30;
          } else if (userAudioLevel > 0.1) {
            noise = (Math.random() - 0.5) * (userAudioLevel * 25);
          }
          
          const y = centerY + wave1 + wave2 + wave3 + noise;
          ctx.lineTo(x, y);
        }
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        
        const gradientIntensity = isAISpeaking || userAudioLevel > 0.1 ? 1 : 0.5;
        const gradient = ctx.createLinearGradient(0, centerY - amplitude, 0, canvas.height);
        gradient.addColorStop(0, layer.color.replace('0.3', String(0.3 * gradientIntensity)).replace('0.4', String(0.4 * gradientIntensity)).replace('0.5', String(0.5 * gradientIntensity)));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, isAISpeaking, userAudioLevel]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ opacity: isActive ? 1 : 0.5 }}
    />
  );
}
