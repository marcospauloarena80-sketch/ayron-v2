'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface RadarDimension {
  label: string;
  value: number;
  color: string;
}

interface Props {
  dimensions: RadarDimension[];
  size?: number;
}

export function OperationalRadar({ dimensions, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const r = (size / 2) * 0.78;
    const n = dimensions.length;
    const levels = 4;

    ctx.clearRect(0, 0, size, size);

    const getPoint = (idx: number, radius: number) => {
      const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
      return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    };

    // Draw grid
    for (let l = 1; l <= levels; l++) {
      const lr = (r * l) / levels;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = getPoint(i, lr);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(27,58,75,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axes
    for (let i = 0; i < n; i++) {
      const p = getPoint(i, r);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(27,58,75,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw filled area
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const { value } = dimensions[i];
      const p = getPoint(i, r * (value / 100));
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, 'rgba(255,107,0,0.35)');
    gradient.addColorStop(1, 'rgba(27,58,75,0.12)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw dots
    for (let i = 0; i < n; i++) {
      const p = getPoint(i, r * (dimensions[i].value / 100));
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FF6B00';
      ctx.fill();
    }

    // Labels
    ctx.font = `bold 9px system-ui, sans-serif`;
    ctx.fillStyle = '#1B3A4B';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const p = getPoint(i, r * 1.22);
      ctx.fillText(dimensions[i].label.toUpperCase(), p.x, p.y);
    }
  }, [dimensions, size]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border border-primary/10"
        style={{ transformOrigin: 'center' }}
      />
      <canvas ref={canvasRef} width={size} height={size} />
    </div>
  );
}
