'use client';

import { useEffect, useState } from 'react';
import { Camera } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { spring } from '@/lib/motion';
import type { FotoRecord } from '@/lib/db';

interface FotosRecentesProps {
  fotos: FotoRecord[];
  onSelect: (bloco: string, apto: string) => void;
}

export function FotosRecentes({ fotos, onSelect }: FotosRecentesProps) {
  const [photoUrls, setPhotoUrls] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const urls = new Map<number, string>();
    const createdBlobUrls: string[] = [];

    for (const f of fotos) {
      if (!f.id) continue;
      if (f.synced && f.uploadUrl) {
        urls.set(f.id, f.uploadUrl);
      } else if (f.blob && f.blob.size > 0) {
        const url = URL.createObjectURL(f.blob);
        createdBlobUrls.push(url);
        urls.set(f.id, url);
      }
    }

    setPhotoUrls(urls);

    return () => {
      createdBlobUrls.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
    };
  }, [fotos]);

  if (fotos.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.15 }}
      className="mb-6"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">Fotos recentes</span>
        <a href="/galeria" className="text-[11px] text-accent hover:text-accent-hover transition-colors">Ver todas</a>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {fotos.map((f) => {
          const src = f.id ? photoUrls.get(f.id) : '';
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.bloco, f.apartamento)}
              className="tactile-press flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-base-border hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none transition-colors relative group"
              aria-label={`Ver ${f.bloco} ${f.apartamento}`}
            >
              {src ? (
                <img src={src} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-base-overlay flex items-center justify-center">
                  <Camera size={16} className="text-content-tertiary" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-base/80 text-[8px] text-content-tertiary text-center py-0.5 font-mono">
                {f.apartamento}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
