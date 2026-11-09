import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Storage } from '../db/storage';
import { syncQueue } from '../db/syncQueue';
import { FotoLocal } from '../types';

interface Props {
  onBack: () => void;
}

export const SyncQueueScreen: React.FC<Props> = ({ onBack }) => {
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const loadQueue = async () => {
    const list = await Storage.getFotos();
    setFotos(list);
    const count = await syncQueue.getPendingCount();
    setPendingCount(count);
  };

  useEffect(() => {
    loadQueue();
    const unsub = syncQueue.subscribe((pending, isSyncing) => {
      setPendingCount(pending);
      setSyncing(isSyncing);
      loadQueue();
    });
    return unsub;
  }, []);

  const handleStartSync = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await syncQueue.startSync();
  };

  const getStatusBadge = (status: FotoLocal['status']) => {
    switch (status) {
      case 'enviado':
        return (
          <View style={[styles.statusBadge, styles.badgeSuccess]}>
            <Feather name="check-circle" size={12} color={THEME.colors.success} />
            <Text style={[styles.badgeLabel, { color: THEME.colors.success }]}>Nuvem OK</Text>
          </View>
        );
      case 'enviando':
        return (
          <View style={[styles.statusBadge, styles.badgeInfo]}>
            <ActivityIndicator size="small" color={THEME.colors.info} />
            <Text style={[styles.badgeLabel, { color: THEME.colors.info }]}>Enviando</Text>
          </View>
        );
      case 'erro':
        return (
          <View style={[styles.statusBadge, styles.badgeDanger]}>
            <Feather name="alert-triangle" size={12} color={THEME.colors.danger} />
            <Text style={[styles.badgeLabel, { color: THEME.colors.danger }]}>Falha</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, styles.badgeWarning]}>
            <Feather name="clock" size={12} color={THEME.colors.warning} />
            <Text style={[styles.badgeLabel, { color: THEME.colors.warning }]}>Pendente</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Feather name="arrow-left" size={22} color={THEME.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fila de Sincronização</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Sync Control Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>
            {pendingCount > 0 ? `${pendingCount} fotos aguardando envio` : 'Todas as fotos sincronizadas'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            Fotos são salvas offline no celular e enviadas ao Vercel Blob
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.syncBtn, (syncing || pendingCount === 0) && styles.syncBtnDisabled]}
          onPress={handleStartSync}
          disabled={syncing || pendingCount === 0}
        >
          {syncing ? (
            <ActivityIndicator color="#0C0F14" />
          ) : (
            <>
              <Feather name="refresh-cw" size={16} color="#0C0F14" />
              <Text style={styles.syncBtnText}>Enviar Agora</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Queue List */}
      <FlatList
        data={fotos}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.photoCard}>
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            <View style={styles.photoInfo}>
              <Text style={styles.photoTitle}>
                {item.bloco} - Apto {item.apartamento}
              </Text>
              <Text style={styles.photoMeta}>
                {item.categoria.replace('_', ' ').toUpperCase()} • {new Date(item.timestamp).toLocaleTimeString()}
              </Text>
              {item.erro ? <Text style={styles.errorSnippet}>{item.erro}</Text> : null}
            </View>
            {getStatusBadge(item.status)}
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  banner: {
    margin: 16,
    padding: 16,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    maxWidth: 200,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
  },
  syncBtnDisabled: {
    opacity: 0.5,
  },
  syncBtnText: {
    color: '#0C0F14',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  photoInfo: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  photoMeta: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  errorSnippet: {
    fontSize: 11,
    color: THEME.colors.danger,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: THEME.colors.success,
  },
  badgeInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: THEME.colors.info,
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: THEME.colors.warning,
  },
  badgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: THEME.colors.danger,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
