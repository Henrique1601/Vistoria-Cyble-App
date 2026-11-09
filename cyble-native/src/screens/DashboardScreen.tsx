import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { api } from '../api/client';
import { Storage } from '../db/storage';
import { syncQueue } from '../db/syncQueue';
import { AuthSession, BuildingConfig, FotoLocal, ApartamentoItem } from '../types';

interface Props {
  session: AuthSession;
  onOpenCaptura: (bloco: string, apto: string) => void;
  onOpenSyncQueue: () => void;
  onLogout: () => void;
}

export const DashboardScreen: React.FC<Props> = ({
  session,
  onOpenCaptura,
  onOpenSyncQueue,
  onLogout,
}) => {
  const [config, setConfig] = useState<BuildingConfig>({
    torres: ['Torre A', 'Torre B', 'Torre C', 'Torre D', 'Torre E', 'Torre F', 'Torre G', 'Torre H'],
    andares: 16,
    aptosPorAndar: 8,
  });
  const [selectedTorre, setSelectedTorre] = useState('Torre A');
  const [search, setSearch] = useState('');
  const [concluidos, setConcluidos] = useState<Record<string, string[]>>({});
  const [fotosLocais, setFotosLocais] = useState<FotoLocal[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    // 1. Carrega dados do Storage Local
    const cfg = await Storage.getBuildingConfig();
    setConfig(cfg);

    const conc = await Storage.getConcluidos();
    setConcluidos(conc);

    const fotos = await Storage.getFotos();
    setFotosLocais(fotos);

    const pending = await syncQueue.getPendingCount();
    setPendingCount(pending);

    // 2. Tenta sincronizar com o backend se online
    try {
      const remoteConc = await api.fetchConcluidos(session.pin);
      if (remoteConc && Object.keys(remoteConc).length > 0) {
        setConcluidos(remoteConc);
        await Storage.setConcluidos(remoteConc);
      }

      const remoteCfg = await api.fetchBuildingConfig(session.pin);
      if (remoteCfg) {
        setConfig(remoteCfg);
        await Storage.setBuildingConfig(remoteCfg);
      }
    } catch {}
  };

  useEffect(() => {
    loadData();
    const unsub = syncQueue.subscribe((pending) => {
      setPendingCount(pending);
    });
    return unsub;
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (session.role === 'admin') {
      await syncQueue.startSync();
    }
    setRefreshing(false);
  };

  // Gerar lista de apartamentos para a torre selecionada
  const apartamentosList = useMemo(() => {
    let aptos: string[] = [];
    if (config.lista && config.lista[selectedTorre]) {
      aptos = config.lista[selectedTorre];
    } else {
      // Padrão: andares 1 a 16 com 8 apartamentos por andar (11 a 18, 21 a 28, ..., 161 a 168)
      for (let andar = 1; andar <= config.andares; andar++) {
        for (let num = 1; num <= config.aptosPorAndar; num++) {
          aptos.push(`${andar}${num < 10 ? '0' + num : num}`);
        }
      }
    }

    const concluidosNaTorre = concluidos[selectedTorre] || [];

    const items: ApartamentoItem[] = aptos.map(num => {
      const fotosDoApto = fotosLocais.filter(
        f => f.bloco === selectedTorre && f.apartamento === num
      );
      const hasAntes = fotosDoApto.some(f => f.categoria === 'cyble_antes');
      const hasDepois = fotosDoApto.some(f => f.categoria === 'cyble_depois');
      const hasDoc = fotosDoApto.some(f => f.categoria === 'documento');

      return {
        numero: num,
        bloco: selectedTorre,
        concluido: concluidosNaTorre.includes(num),
        fotosCount: fotosDoApto.length,
        hasAntes,
        hasDepois,
        hasDoc,
      };
    });

    if (search.trim()) {
      return items.filter(i => i.numero.includes(search.trim()));
    }
    return items;
  }, [config, selectedTorre, concluidos, fotosLocais, search]);

  // Estatísticas de conclusão da torre
  const stats = useMemo(() => {
    const total = apartamentosList.length;
    const concluidosCount = apartamentosList.filter(a => a.concluido).length;
    const percent = total > 0 ? Math.round((concluidosCount / total) * 100) : 0;
    return { total, concluidosCount, percent };
  }, [apartamentosList]);

  const handleToggleConcluido = async (apto: ApartamentoItem) => {
    if (session.role !== 'admin') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const novoStatus = !apto.concluido;

    if (novoStatus) {
      await Storage.addConcluido(apto.bloco, apto.numero);
      api.marcarConcluido(apto.bloco, apto.numero, session.pin);
    } else {
      await Storage.removeConcluido(apto.bloco, apto.numero);
      api.desmarcarConcluido(apto.bloco, apto.numero, session.pin);
    }

    const updated = await Storage.getConcluidos();
    setConcluidos({ ...updated });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Vistoria Cyble</Text>
          <View style={styles.roleBadge}>
            <View style={[styles.roleDot, session.role === 'admin' ? styles.dotAdmin : styles.dotViewer]} />
            <Text style={styles.roleText}>{session.role === 'admin' ? 'Administrador' : 'Visualizador'}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.queueBtn} onPress={onOpenSyncQueue}>
            <Feather name="cloud" size={18} color={pendingCount > 0 ? THEME.colors.warning : THEME.colors.primary} />
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Feather name="log-out" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Torre Selector Tabs */}
      <View style={styles.torreTabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={config.torres}
          keyExtractor={item => item}
          contentContainerStyle={styles.torreTabsContent}
          renderItem={({ item }) => {
            const isSelected = item === selectedTorre;
            return (
              <TouchableOpacity
                style={[styles.torreTab, isSelected && styles.torreTabSelected]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedTorre(item);
                }}
              >
                <Text style={[styles.torreTabText, isSelected && styles.torreTabTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Search & Stats Bar */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={THEME.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar apartamento..."
            placeholderTextColor={THEME.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            keyboardType="numeric"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressText}>
            <Text style={styles.progressHighlight}>{stats.concluidosCount}</Text> / {stats.total} aptos ({stats.percent}%)
          </Text>
        </View>
      </View>

      {/* Apartments Grid/List */}
      <FlatList
        data={apartamentosList}
        keyExtractor={item => `${item.bloco}-${item.numero}`}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={THEME.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.aptoCard, item.concluido && styles.aptoCardConcluido]}
            activeOpacity={0.7}
            onPress={() => onOpenCaptura(item.bloco, item.numero)}
            onLongPress={() => handleToggleConcluido(item)}
          >
            <View style={styles.aptoCardHeader}>
              <Text style={styles.aptoNumero}>{item.numero}</Text>
              {session.role === 'admin' && (
                <TouchableOpacity
                  onPress={() => handleToggleConcluido(item)}
                  style={[styles.checkBtn, item.concluido && styles.checkBtnActive]}
                >
                  <Feather
                    name="check"
                    size={14}
                    color={item.concluido ? '#0C0F14' : THEME.colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Status Dots */}
            <View style={styles.dotsContainer}>
              <View style={[styles.statusDot, item.hasAntes && styles.dotAntes]}>
                <Text style={styles.dotMiniLabel}>A</Text>
              </View>
              <View style={[styles.statusDot, item.hasDepois && styles.dotDepois]}>
                <Text style={styles.dotMiniLabel}>D</Text>
              </View>
              <View style={[styles.statusDot, item.hasDoc && styles.dotDoc]}>
                <Text style={styles.dotMiniLabel}>Doc</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotAdmin: {
    backgroundColor: THEME.colors.primary,
  },
  dotViewer: {
    backgroundColor: THEME.colors.accent,
  },
  roleText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  queueBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: THEME.colors.warning,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#0C0F14',
    fontSize: 10,
    fontWeight: '700',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  torreTabsContainer: {
    marginVertical: 12,
  },
  torreTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  torreTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  torreTabSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  torreTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  torreTabTextSelected: {
    color: '#0C0F14',
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.text,
    fontSize: 14,
  },
  progressCard: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  progressHighlight: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 10,
  },
  aptoCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
  },
  aptoCardConcluido: {
    borderColor: THEME.colors.primary,
    backgroundColor: '#0F291E',
  },
  aptoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aptoNumero: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  checkBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  statusDot: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  dotAntes: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  dotDepois: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  dotDoc: {
    backgroundColor: '#4C1D95',
    borderColor: '#8B5CF6',
  },
  dotMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.text,
  },
});
