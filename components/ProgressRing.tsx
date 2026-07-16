'use client';

import { motion } from 'framer-motion';

export default function ProgressRing({
  percentage,
  size = 48,
  strokeWidth = 4,
  label,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-base-overlay"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={percentage === 100 ? 'text-success' : percentage > 0 ? 'text-accent' : 'text-content-tertiary'}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-mono font-bold text-content">{percentage}%</span>
        {label && <span className="text-[7px] text-content-tertiary leading-none">{label}</span>}
      </div>
    </div>
  );
}
