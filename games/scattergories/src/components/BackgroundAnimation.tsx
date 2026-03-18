import React, { useEffect, useRef } from 'react';

interface Props {
  intensity?: 'lively' | 'calm';
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'triangle' | 'diamond';
}

const COLORS = [
  'rgba(168, 85, 247,',   // purple-500
  'rgba(20, 184, 166,',   // teal-500
  'rgba(250, 204, 21,',   // accent-400
  'rgba(192, 132, 252,',  // purple-400
  'rgba(94, 234, 212,',   // teal-300
];

export default function BackgroundAnimation({ intensity = 'lively' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = intensity === 'lively' ? 25 : 15;
    const speedMult = intensity === 'lively' ? 1 : 0.4;

    // Initialize particles
    const particles: Particle[] = [];
    const shapes: Particle['shape'][] = ['circle', 'triangle', 'diamond'];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 6 + Math.random() * 18,
        speedX: (Math.random() - 0.5) * 0.6 * speedMult,
        speedY: (Math.random() - 0.5) * 0.4 * speedMult - 0.15 * speedMult,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0.12 + Math.random() * 0.18,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.015 * speedMult,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }
    particlesRef.current = particles;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        // Wrap around edges
        if (p.x < -p.size) p.x = canvas.width + p.size;
        if (p.x > canvas.width + p.size) p.x = -p.size;
        if (p.y < -p.size) p.y = canvas.height + p.size;
        if (p.y > canvas.height + p.size) p.y = -p.size;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = `${p.color} ${p.opacity})`;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.866, p.size * 0.5);
          ctx.lineTo(-p.size * 0.866, p.size * 0.5);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.7, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.7, 0);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
