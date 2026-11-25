import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { THEME } from './src/constants/theme';
import { Storage } from './src/db/storage';
import { AuthSession } from './src/types';
import { PinGateScreen } from './src/screens/PinGateScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { CapturaScreen } from './src/screens/CapturaScreen';
import { SyncQueueScreen } from './src/screens/SyncQueueScreen';

type Screen = 'pingate' | 'dashboard' | 'captura' | 'sync_queue';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorMsg: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || 'Erro desconhecido na interface' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Ops! Erro ao carregar tela</Text>
          <Text style={styles.errorText}>{this.state.errorMsg}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => this.setState({ hasError: false, errorMsg: '' })}
          >
            <Text style={styles.retryBtnText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('pingate');
  const [selectedTarget, setSelectedTarget] = useState<{ bloco: string; apto: string }>({
    bloco: 'Torre A',
    apto: '11',
  });

  useEffect(() => {
    let mounted = true;
    const fallbackTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    (async () => {
      try {
        const cached = await Storage.getSession();
        if (mounted && cached && cached.authenticated) {
          setSession(cached);
          setCurrentScreen('dashboard');
        }
      } catch (err) {
        console.warn('Failed to restore session', err);
      } finally {
        clearTimeout(fallbackTimer);
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    await Storage.clearSession();
    setSession(null);
    setCurrentScreen('pingate');
  };

  const handleOpenCaptura = (bloco: string, apto: string) => {
    setSelectedTarget({ bloco, apto });
    setCurrentScreen('captura');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  const androidTopPadding = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0;

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: androidTopPadding }]}>
        <StatusBar style="light" />

        {currentScreen === 'pingate' && (
          <PinGateScreen onSuccess={handleLoginSuccess} />
        )}

        {currentScreen === 'dashboard' && session && (
          <DashboardScreen
            session={session}
            onOpenCaptura={handleOpenCaptura}
            onOpenSyncQueue={() => setCurrentScreen('sync_queue')}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'captura' && (
          <CapturaScreen
            bloco={selectedTarget.bloco}
            apartamento={selectedTarget.apto}
            onBack={() => setCurrentScreen('dashboard')}
          />
        )}

        {currentScreen === 'sync_queue' && (
          <SyncQueueScreen onBack={() => setCurrentScreen('dashboard')} />
        )}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.danger,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#0C0F14',
    fontWeight: '700',
  },
});
