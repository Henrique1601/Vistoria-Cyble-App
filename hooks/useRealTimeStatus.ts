'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface TowerStatus {
  nome: string;
  total: number;
  concluidos: number;
  percentual: number;
  timestamp: number;
}

function getPin(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('vistoria_pin') || '';
}

export function useRealTimeStatus(intervalMs = 30000) {
  const [status, setStatus] = useState<Record<string, TowerStatus>>({});
  const [lastUpdate, setLastUpdate] = useState(0);
  const [online, setOnline] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchStatus = useCallback(async () => {
    const pin = getPin();
    if (!pin) { setOnline(true); return; }
    try {
      const res = await fetch(`/api/status`, {
        headers: { 'x-app-pin': pin },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status || {});
        setLastUpdate(data.lastUpdate || Date.now());
        setOnline(true);
      }
    } catch {
      setOnline(false);
    }
  }, []);

  const updateMyStatus = useCallback(async (bloco: string, apartamento: string, concluido: boolean) => {
    const pin = getPin();
    if (!pin) return;
    try {
      await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-app-pin': pin },
        body: JSON.stringify({ bloco, apartamento, concluido }),
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, intervalMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchStatus, intervalMs]);

  return { status, lastUpdate, online, refresh: fetchStatus, updateMyStatus };
}
