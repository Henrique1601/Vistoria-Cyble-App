'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  carregarListaApartamentos,
  statusDeTodosApartamentos,
  fotosPendentesCount,
  ultimasFotos,
  contarComentariosBloco,
  carregarTrocas,
  salvarTrocas,
  ApartamentoStatus,
  FotoRecord,
  TrocaInfo,
} from '@/lib/db';
import { normApto, normalizeBloco, estaNoIntervalo, formatarDataParaInput } from '@/lib/utils';
import { MS_PER_DAY } from '@/lib/constants';
import { FotoOnline } from '@/components/EstatisticasPeriodo';

export function useVistoriaState(pin: string | null, diasAlerta = 7) {
  const [lista, setLista] = useState<Record<string, string[]> | null>(null);
  const [listaAnterior, setListaAnterior] = useState<Record<string, string[]> | null>(null);
  const [status, setStatus] = useState<ApartamentoStatus[]>([]);
  const statusRef = useRef<ApartamentoStatus[]>([]);
  statusRef.current = status;
  const [fotosOnline, setFotosOnline] = useState<FotoOnline[]>([]);
  const [fotosRecentes, setFotosRecentes] = useState<FotoRecord[]>([]);
  const [pendentes, setPendentes] = useState(0);
  const [loadingSkeleton, setLoadingSkeleton] = useState(true);
  const [comentarioCounts, setComentarioCounts] = useState<Record<string, number>>({});
  const [agendamentosConcluidos, setAgendamentosConcluidos] = useState<Set<string>>(new Set());
  const [concluidosRemotos, setConcluidosRemotos] = useState<Set<string>>(new Set());
  const [trocasMap, setTrocasMap] = useState<Record<string, TrocaInfo>>({});

  // Carregar lista de apartamentos inicial
  useEffect(() => {
    if (pin) {
      carregarListaApartamentos().then((l) => setLista(Object.keys(l).length ? l : null));
    }
  }, [pin]);

  // Carregar fotos online da API
  const refreshFotosOnline = useCallback(() => {
    if (!pin) return;
    fetch('/api/fotos', { headers: { 'x-app-pin': pin } })
      .then((r) => r.json())
      .then((data) => setFotosOnline(data.fotos || []))
      .catch(() => {});
  }, [pin]);

  // Carregar agendamentos concluídos da API
  const refreshAgendamentos = useCallback(() => {
    if (!pin) return;
    fetch('/api/agendamentos', { headers: { 'x-app-pin': pin } })
      .then((r) => r.json())
      .then((data: unknown) => {
        const set = new Set<string>();
        const list = Array.isArray(data) ? data : ((data as { agendamentos?: Array<{ bloco: string; apartamento: string; concluido: boolean }> })?.agendamentos || []);
        if (Array.isArray(list)) {
          list.forEach((ag: { bloco: string; apartamento: string; concluido: boolean }) => {
            if (ag.concluido) {
              set.add(`${normalizeBloco(ag.bloco)}__${normApto(ag.apartamento)}`);
            }
          });
        }
        setAgendamentosConcluidos(set);
      })
      .catch(() => {});
  }, [pin]);

  // Carregar apartamentos concluídos da nuvem/IndexedDB (sem fotos)
  const refreshConcluidos = useCallback(async () => {
    if (!pin) return;
    try {
      const { carregarConcluidos } = await import('@/lib/db');
      const c = await carregarConcluidos();
      const set = new Set<string>();
      for (const [bloco, aptos] of Object.entries(c)) {
        const bNorm = normalizeBloco(bloco);
        if (Array.isArray(aptos)) {
          for (const a of aptos) {
            const aNorm = normApto(a);
            if (aNorm) set.add(`${bNorm}__${aNorm}`);
          }
        }
      }
      setConcluidosRemotos(set);
    } catch {}
  }, [pin]);

  const refreshTrocas = useCallback(async () => {
    try {
      const localTrocas = await carregarTrocas();
      let mergedTrocas: Record<string, TrocaInfo> = { ...localTrocas };
      if (pin) {
        try {
          const res = await fetch('/api/building-config', { headers: { 'x-app-pin': pin } });
          if (res.ok) {
            const data = await res.json();
            const remoteTrocas = data?.buildings?.[0]?.config?.trocas as Record<string, TrocaInfo> | undefined;
            if (remoteTrocas && typeof remoteTrocas === 'object') {
              mergedTrocas = { ...remoteTrocas, ...localTrocas };
              for (const [k, remoteVal] of Object.entries(remoteTrocas)) {
                const localVal = localTrocas[k];
                if (localVal) {
                  mergedTrocas[k] = {
                    data: localVal.data || remoteVal.data,
                    por: localVal.por || remoteVal.por,
                  };
                }
              }
              await salvarTrocas(mergedTrocas);
            }
          }
        } catch {}
      }
      setTrocasMap(mergedTrocas);
    } catch {}
  }, [pin]);

  useEffect(() => {
    refreshFotosOnline();
    refreshAgendamentos();
    refreshConcluidos();
    refreshTrocas();
  }, [refreshFotosOnline, refreshAgendamentos, refreshConcluidos, refreshTrocas]);

  // Sincronizar dados da nuvem ao retornar ao app (foreground) ou reconectar em campo (throttle 60s)
  const lastRemoteSyncRef = useRef(0);
  useEffect(() => {
    if (!pin) return;
    const syncIfStale = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRemoteSyncRef.current < 60_000) return;
      lastRemoteSyncRef.current = now;
      refreshFotosOnline();
      refreshAgendamentos();
      refreshConcluidos();
      refreshTrocas();
    };
    document.addEventListener('visibilitychange', syncIfStale);
    window.addEventListener('online', syncIfStale);
    return () => {
      document.removeEventListener('visibilitychange', syncIfStale);
      window.removeEventListener('online', syncIfStale);
    };
  }, [pin, refreshFotosOnline, refreshAgendamentos, refreshConcluidos, refreshTrocas]);

  // Atualizar status de todos os apartamentos
  const refreshStatus = useCallback(async () => {
    try {
      if (lista) {
        setLoadingSkeleton(true);
        const newStatus = await statusDeTodosApartamentos(lista);
        setStatus(newStatus);
        setLoadingSkeleton(false);
        const totalPendentes = newStatus.reduce((acc, s) => acc + (s.qtdPendentes ?? 0), 0);
        setPendentes(totalPendentes);
        return newStatus;
      }
      setPendentes(await fotosPendentesCount());
      return statusRef.current;
    } catch (err) {
      console.warn('refreshStatus error:', err);
      setLoadingSkeleton(false);
      return statusRef.current;
    }
  }, [lista]);

  useEffect(() => {
    if (lista) refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista]);

  // Atualizar fotos recentes
  useEffect(() => {
    ultimasFotos(10).then(setFotosRecentes);
  }, [status]);

  // Contagem de comentários por bloco
  const refreshCommentCounts = useCallback(async (bloco?: string) => {
    if (!bloco || !lista?.[bloco]) return;
    const counts = await contarComentariosBloco(bloco);
    setComentarioCounts((prev) => ({ ...prev, ...counts }));
  }, [lista]);

  // Mapas memoizados O(1)
  const statusMap = useMemo(() => {
    const map = new Map<string, ApartamentoStatus>();
    for (const s of status) {
      map.set(`${s.bloco}__${normApto(s.apartamento)}`, s);
    }
    return map;
  }, [status]);

  const fotosOnlineMap = useMemo(() => {
    const map = new Map<string, { count: number; aptos: Set<string> }>();
    fotosOnline.forEach((f) => {
      const key = normalizeBloco(f.bloco);
      if (!map.has(key)) map.set(key, { count: 0, aptos: new Set() });
      const entry = map.get(key)!;
      entry.count++;
      entry.aptos.add(normApto(f.apartamento));
    });
    return map;
  }, [fotosOnline]);

  const fotosOnlineDetalhadoMap = useMemo(() => {
    const map = new Map<string, { temAntes: boolean; temDepois: boolean; temDoc: boolean; count: number; latestDate?: string }>();
    fotosOnline.forEach((f) => {
      const key = `${normalizeBloco(f.bloco)}__${normApto(f.apartamento)}`;
      if (!map.has(key)) {
        map.set(key, { temAntes: false, temDepois: false, temDoc: false, count: 0 });
      }
      const entry = map.get(key)!;
      entry.count++;
      if (f.data_leitura) {
        const isoDate = String(f.data_leitura).slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate) && (!entry.latestDate || isoDate > entry.latestDate)) {
          entry.latestDate = isoDate;
        }
      }
      const isAntes = f.foto_index === 0 || f.foto_url.includes('cyble_antes') || f.foto_url.includes('antes');
      const isDepois = f.foto_index === 1 || f.foto_url.includes('cyble_depois') || f.foto_url.includes('depois');
      const isDoc = f.foto_index === 2 || f.foto_url.includes('documento') || f.foto_url.includes('doc');
      if (isAntes) entry.temAntes = true;
      if (isDepois) entry.temDepois = true;
      if (isDoc) entry.temDoc = true;
    });
    return map;
  }, [fotosOnline]);

  const fotosCountMap = useMemo(() => {
    const map = new Map<string, number>();
    fotosOnline.forEach((f) => {
      const key = `${normalizeBloco(f.bloco)}__${normApto(f.apartamento)}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [fotosOnline]);

  const blocos = useMemo(() => {
    const fromLista = lista ? Object.keys(lista) : [];
    const fromOnline = [...fotosOnlineMap.keys()];
    const allRaw = new Set([...fromLista, ...fromOnline]);
    const letterMap = new Map<string, string>();
    const result: string[] = [];
    for (const b of allRaw) {
      const letter = b.replace(/^Torre\s+/i, '').trim();
      if (letter.length === 1 && /^[A-H]$/i.test(letter)) {
        const key = letter.toUpperCase();
        if (!letterMap.has(key)) {
          const torreName = fromLista.find((n) => n.toUpperCase() === `TORRE ${key}`) || b;
          letterMap.set(key, torreName);
          result.push(torreName);
        }
      } else {
        result.push(b);
      }
    }
    return result.sort();
  }, [lista, fotosOnlineMap]);

  const progressoMap = useMemo(() => {
    const map = new Map<
      string,
      {
        texto: string;
        pct: number;
        total: number;
        completos: number;
        emAndamento: number;
        pendentes: number;
        pctCompletos: number;
        pctAndamento: number;
      }
    >();
    for (const b of blocos) {
      const codigosLocais = (lista?.[b] || []).map(normApto);
      const entry = fotosOnlineMap.get(b);
      const aptosOnline = entry?.aptos ?? new Set<string>();
      const allAptos = new Set<string>([...codigosLocais, ...aptosOnline]);
      const total = allAptos.size;

      let completos = 0;
      let emAndamento = 0;

      for (const c of allAptos) {
        const key = `${b}__${c}`;
        const st = statusMap.get(key);
        const onlineInfo = fotosOnlineDetalhadoMap.get(key);

        const temAntes = Boolean((st && st.cybleAntesFeito) || onlineInfo?.temAntes);
        const temDepois = Boolean((st && st.cybleDepoisFeito) || onlineInfo?.temDepois);
        const temDoc = Boolean((st && (st.qtdDocumentos ?? 0) > 0) || onlineInfo?.temDoc);
        const qtdFotosTotal = (st?.qtdFotos ?? 0) + (onlineInfo?.count ?? 0);

        const feitoLocal = Boolean(st && (st.isConcluido || (st.cybleAntesFeito && st.cybleDepoisFeito)));
        const feitoAgenda = agendamentosConcluidos.has(key);
        const feitoRemoto = concluidosRemotos.has(key);
        const fotosConcluidas = (temAntes && temDepois) || (temAntes && temDepois && temDoc);

        const isConcluido = feitoLocal || feitoAgenda || feitoRemoto || fotosConcluidas;

        if (isConcluido) {
          completos++;
        } else if (temAntes || temDepois || temDoc || qtdFotosTotal > 0) {
          emAndamento++;
        }
      }

      const pendentes = Math.max(0, total - completos - emAndamento);
      const pctCompletos = total > 0 ? Math.round((completos / total) * 100) : 0;
      const pctAndamento = total > 0 ? Math.round((emAndamento / total) * 100) : 0;

      map.set(b, {
        texto: `${completos}/${total}`,
        pct: pctCompletos,
        total,
        completos,
        emAndamento,
        pendentes,
        pctCompletos,
        pctAndamento,
      });
    }
    return map;
  }, [blocos, lista, fotosOnlineMap, fotosOnlineDetalhadoMap, statusMap, agendamentosConcluidos, concluidosRemotos]);

  const aptosEsquecidos = useMemo(() => {
    const cutoff = Date.now() - diasAlerta * MS_PER_DAY;
    const aptosComFotoRecente = new Set<string>();
    fotosOnline.forEach((f) => {
      const ts = new Date(f.data_leitura + 'T12:00:00').getTime();
      if (ts > cutoff) aptosComFotoRecente.add(`${f.bloco}__${normApto(f.apartamento)}`);
    });
    status.forEach((s) => {
      if (s.cybleAntesFeito || s.cybleDepoisFeito) {
        aptosComFotoRecente.add(`${s.bloco}__${normApto(s.apartamento)}`);
      }
    });
    const result: { bloco: string; apartamento: string }[] = [];
    for (const b of blocos) {
      const codigosLocais = (lista?.[b] || []).map(normApto);
      const entry = fotosOnlineMap.get(b);
      const aptosOnline = entry?.aptos ?? new Set<string>();
      const allAptos = new Set<string>([...codigosLocais, ...aptosOnline]);
      for (const c of allAptos) {
        if (!aptosComFotoRecente.has(`${b}__${c}`)) {
          result.push({ bloco: b, apartamento: c });
        }
      }
    }
    return result;
  }, [fotosOnline, status, blocos, lista, fotosOnlineMap, diasAlerta]);

  const statusMerged = useMemo(() => {
    const merged = new Map<string, ApartamentoStatus>();

    for (const s of status) {
      const key = `${normalizeBloco(s.bloco)}__${normApto(s.apartamento)}`;
      merged.set(key, { ...s, bloco: normalizeBloco(s.bloco), apartamento: normApto(s.apartamento) });
    }

    // 2. Mesclar fotos online detalhadas com precisão
    for (const [key, onlineInfo] of fotosOnlineDetalhadoMap) {
      const [bloco, apto] = key.split('__');
      const onlineCount = onlineInfo.count;
      const temAntes = onlineInfo.temAntes;
      const temDepois = onlineInfo.temDepois;
      const temDoc = onlineInfo.temDoc;
      const concluidoOnline = (temAntes && temDepois) || (temAntes && temDepois && temDoc);

      if (!merged.has(key)) {
        merged.set(key, {
          bloco,
          apartamento: apto,
          cybleAntesFeito: temAntes,
          cybleDepoisFeito: temDepois,
          qtdDocumentos: temDoc ? 1 : 0,
          qtdFotos: onlineCount,
          isConcluido: concluidoOnline,
          qtdPendentes: 0,
          qtdSynced: onlineCount,
        });
      } else {
        const existing = merged.get(key)!;
        if (temAntes) existing.cybleAntesFeito = true;
        if (temDepois) existing.cybleDepoisFeito = true;
        if (temDoc && (existing.qtdDocumentos ?? 0) === 0) existing.qtdDocumentos = 1;
        if (onlineCount > (existing.qtdFotos ?? 0)) {
          existing.qtdFotos = onlineCount;
        }
        if (concluidoOnline || (existing.cybleAntesFeito && existing.cybleDepoisFeito)) {
          existing.isConcluido = true;
        }
      }
    }

    // 3. Mesclar agendamentos concluídos
    for (const key of agendamentosConcluidos) {
      const [bloco, apto] = key.split('__');
      if (!merged.has(key)) {
        merged.set(key, {
          bloco,
          apartamento: apto,
          cybleAntesFeito: true,
          cybleDepoisFeito: true,
          qtdDocumentos: 0,
          qtdFotos: fotosCountMap.get(key) || 0,
          isConcluido: true,
          qtdPendentes: 0,
          qtdSynced: 0,
        });
      } else {
        const existing = merged.get(key)!;
        existing.cybleAntesFeito = true;
        existing.cybleDepoisFeito = true;
        existing.isConcluido = true;
      }
    }

    // 4. Mesclar apartamentos concluídos remotos (Neon DB / IndexedDB sem fotos)
    for (const key of concluidosRemotos) {
      const [bloco, apto] = key.split('__');
      if (!merged.has(key)) {
        merged.set(key, {
          bloco,
          apartamento: apto,
          cybleAntesFeito: true,
          cybleDepoisFeito: true,
          qtdDocumentos: 0,
          qtdFotos: fotosCountMap.get(key) || 0,
          isConcluido: true,
          qtdPendentes: 0,
          qtdSynced: 0,
        });
      } else {
        const existing = merged.get(key)!;
        existing.cybleAntesFeito = true;
        existing.cybleDepoisFeito = true;
        existing.isConcluido = true;
      }
    }

    for (const [key, s] of merged) {
      const onlineCount = fotosCountMap.get(key) || 0;
      if (onlineCount > s.qtdFotos) {
        s.qtdFotos = onlineCount;
      }
      const onlineInfo = fotosOnlineDetalhadoMap.get(key);
      const trocaInfo = trocasMap[key];
      const temTroca = Boolean(s.isConcluido || s.qtdFotos > 0);
      if (temTroca) {
        s.dataTroca = trocaInfo?.data || onlineInfo?.latestDate || s.dataTroca;
        s.trocadoPor = trocaInfo?.por || s.trocadoPor || 'Henrique';
      } else {
        s.dataTroca = undefined;
        s.trocadoPor = undefined;
      }
    }

    return [...merged.values()];
  }, [status, fotosOnlineDetalhadoMap, fotosCountMap, agendamentosConcluidos, concluidosRemotos, trocasMap]);

  const statusMergedMap = useMemo(() => {
    const map = new Map<string, ApartamentoStatus>();
    for (const s of statusMerged) {
      map.set(`${normalizeBloco(s.bloco)}__${normApto(s.apartamento)}`, s);
    }
    return map;
  }, [statusMerged]);

  return {
    lista,
    setLista,
    listaAnterior,
    setListaAnterior,
    status,
    setStatus,
    fotosOnline,
    fotosRecentes,
    setFotosRecentes,
    pendentes,
    setPendentes,
    loadingSkeleton,
    comentarioCounts,
    setComentarioCounts,
    refreshStatus,
    refreshFotosOnline,
    refreshCommentCounts,
    refreshAgendamentos,
    agendamentosConcluidos,
    statusMap,
    statusMergedMap,
    fotosOnlineMap,
    fotosOnlineDetalhadoMap,
    fotosCountMap,
    blocos,
    progressoMap,
    aptosEsquecidos,
    statusMerged,
  };
}
