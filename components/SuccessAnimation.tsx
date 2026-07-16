'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

const COLORS = ['#e8823a', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa'];

export function Confetti({ show, onComplete }: { show: boolean; onComplete?: () => void }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!show) { setParticles([]); return; }
    const p: Particle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.3,
    }));
    setParticles(p);
    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden" aria-hidden="true">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: `${p.x}vw`, y: '20vh', rotate: 0, opacity: 1 }}
              animate={{
                y: '110vh',
                x: `${p.x + (Math.random() - 0.5) * 20}vw`,
                rotate: p.rotation + 720,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 1.2 + Math.random() * 0.5, delay: p.delay, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export function SuccessCheck({ show, onComplete }: { show: boolean; onComplete?: () => void }) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => onComplete?.(), 1200);
    return () => clearTimeout(timer);
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-[99] pointer-events-none"
          aria-hidden="true"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-20 h-20 rounded-full bg-success/20 border-2 border-success flex items-center justify-center"
          >
            <motion.svg
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              viewBox="0 0 24 24"
              className="w-10 h-10 text-success"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              />
            </motion.svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
