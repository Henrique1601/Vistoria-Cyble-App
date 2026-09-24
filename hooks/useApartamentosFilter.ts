'use client';

import { useState, useMemo, useEffect } from 'react';
import { ApartamentoStatus } from '@/lib/db';
import { normApto, normalizeBloco } from '@/lib/utils';
import { getItensPagina, getModoCompacto, getAltoContraste } from '@/lib/settings';

export type OrdemTipo = 'original' | 'pendentes';
export type StatusFilterTipo = 'todos' | 'concluido' | 'em_andamento' | 'pendente';

interface UseApartamentosFilterProps {
  blocoAtual: string | null;
  lista: Record<string, string[]> | null;
  statusMap: Map<string, ApartamentoStatus>;
  fotosOnlineMap: Map<string, { count: number; aptos: Set<string> }>;
  fotosCountMap: Map<string, number>;
  fotosOnlineDetalhadoMap?: Map<string, { temAntes: boolean; temDepois: boolean; temDoc: boolean; count: number }>;
}

export function useApartamentosFilter({
  blocoAtual,
  lista,
  statusMap,
  fotosOnlineMap,
  fotosCountMap,
  fotosOnlineDetalhadoMap,
}: UseApartamentosFilterProps) {
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<OrdemTipo>('original');
  const [statusFilter, setStatusFilter] = useState<StatusFilterTipo>('todos');
  const [itensPagina, setItensPagina] = useState<10 | 20 | 50 | 999>(20);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [modoCompacto, setModoCompactoState] = useState(false);
  const [altoContraste, setAltoContrasteState] = useState(false);

  useEffect(() => {
    setItensPagina(getItensPagina() as 10 | 20 | 50 | 999);
    setModoCompactoState(getModoCompacto());
    setAltoContrasteState(getAltoContraste());
  }, []);

  const aptosOnlineDoBloco = useMemo(() => {
    if (!blocoAtual) return new Set<string>();
    const entry = fotosOnlineMap.get(normalizeBloco(blocoAtual));
    return entry?.aptos ?? new Set<string>();
  }, [fotosOnlineMap, blocoAtual]);

  const aptosDoBloco = useMemo(() => {
    if (!blocoAtual) return [];

    const resolvedBloco = normalizeBloco(blocoAtual);
    const codigosLocais = (lista?.[resolvedBloco] || []).map(normApto);
    const aptosOnlineList = [...aptosOnlineDoBloco];

    const allAptos = new Set<string>([
      ...codigosLocais,
      ...aptosOnlineList,
    ]);

    const result = [...allAptos]
      .map((c) => {
        const key = `${resolvedBloco}__${c}`;
        const local = statusMap.get(key);
        if (local) return { ...local, apartamento: c };

        const onlineInfo = fotosOnlineDetalhadoMap?.get(key);
        const temAntes = onlineInfo?.temAntes ?? false;
        const temDepois = onlineInfo?.temDepois ?? false;
        const temDoc = onlineInfo?.temDoc ?? false;
        const onlineCount = onlineInfo?.count ?? (fotosCountMap.get(key) || 0);
        const concluido = (temAntes && temDepois) || (temAntes && temDepois && temDoc);

        return {
          bloco: resolvedBloco,
          apartamento: c,
          cybleAntesFeito: temAntes,
          cybleDepoisFeito: temDepois,
          qtdDocumentos: temDoc ? 1 : 0,
          qtdFotos: onlineCount,
          isConcluido: concluido,
        };
      })
      .filter((s) => s.apartamento.toLowerCase().includes(busca.toLowerCase()));

    // Filtragem por status
    const statusFiltered = result.filter((s) => {
      if (statusFilter === 'todos') return true;
      const isConc = Boolean(s.isConcluido || (s.cybleAntesFeito && s.cybleDepoisFeito));
      const isAndam = !isConc && Boolean(s.cybleAntesFeito || s.cybleDepoisFeito || (s.qtdDocumentos ?? 0) > 0 || (s.qtdFotos ?? 0) > 0);
      const st = isConc
        ? 'concluido'
        : isAndam
        ? 'em_andamento'
        : 'pendente';
      return st === statusFilter;
    });

    if (ordem === 'pendentes') {
      statusFiltered.sort((a, b) => {
        const aC = Boolean(a.isConcluido || (a.cybleAntesFeito && a.cybleDepoisFeito));
        const bC = Boolean(b.isConcluido || (b.cybleAntesFeito && b.cybleDepoisFeito));
        if (aC === bC) return 0;
        return aC ? 1 : -1;
      });
    } else {
      statusFiltered.sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true }));
    }

    return statusFiltered;
  }, [blocoAtual, lista, statusMap, busca, ordem, statusFilter, aptosOnlineDoBloco, fotosCountMap, fotosOnlineDetalhadoMap]);

  // Paginação
  const totalPaginas = itensPagina === 999 ? 1 : Math.ceil(aptosDoBloco.length / itensPagina);
  const aptosPaginados = useMemo(() => {
    if (itensPagina === 999) return aptosDoBloco;
    const start = (paginaAtual - 1) * itensPagina;
    return aptosDoBloco.slice(start, start + itensPagina);
  }, [aptosDoBloco, paginaAtual, itensPagina]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [blocoAtual, busca, ordem, statusFilter]);

  return {
    busca,
    setBusca,
    ordem,
    setOrdem,
    statusFilter,
    setStatusFilter,
    itensPagina,
    setItensPagina,
    paginaAtual,
    setPaginaAtual,
    totalPaginas,
    modoCompacto,
    setModoCompactoState,
    altoContraste,
    setAltoContrasteState,
    aptosOnlineDoBloco,
    aptosDoBloco,
    aptosPaginados,
  };
}
