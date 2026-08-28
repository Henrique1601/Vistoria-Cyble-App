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
}

export function useApartamentosFilter({
  blocoAtual,
  lista,
  statusMap,
  fotosOnlineMap,
  fotosCountMap,
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
        const local = statusMap.get(`${resolvedBloco}__${c}`);
        if (local) return { ...local, apartamento: c };
        const temFotoOnline = aptosOnlineDoBloco.has(c);
        return {
          bloco: resolvedBloco,
          apartamento: c,
          cybleAntesFeito: temFotoOnline,
          cybleDepoisFeito: temFotoOnline,
          qtdDocumentos: 0,
          qtdFotos: fotosCountMap.get(`${resolvedBloco}__${c}`) || 0,
        };
      })
      .filter((s) => s.apartamento.toLowerCase().includes(busca.toLowerCase()));

    // Filtragem por status
    const statusFiltered = result.filter((s) => {
      if (statusFilter === 'todos') return true;
      const st = s.cybleAntesFeito && s.cybleDepoisFeito
        ? 'concluido'
        : (s.cybleAntesFeito || s.cybleDepoisFeito || s.qtdDocumentos > 0)
        ? 'em_andamento'
        : 'pendente';
      return st === statusFilter;
    });

    if (ordem === 'pendentes') {
      statusFiltered.sort((a, b) => {
        const aC = a.cybleAntesFeito && a.cybleDepoisFeito;
        const bC = b.cybleAntesFeito && b.cybleDepoisFeito;
        if (aC === bC) return 0;
        return aC ? 1 : -1;
      });
    } else {
      statusFiltered.sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true }));
    }

    return statusFiltered;
  }, [blocoAtual, lista, statusMap, busca, ordem, statusFilter, aptosOnlineDoBloco, fotosCountMap]);

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
