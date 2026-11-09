import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { THEME } from './src/constants/theme';
import { Storage } from './src/db/storage';
import { AuthSession } from './src/types';
import { PinGateScreen } from './src/screens/PinGateScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { CapturaScreen } from './src/screens/CapturaScreen';
import { SyncQueueScreen } from './src/screens/SyncQueueScreen';

type Screen = 'pingate' | 'dashboard' | 'captura' | 'sync_queue';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('pingate');
  const [selectedTarget, setSelectedTarget] = useState<{ bloco: string; apto: string }>({
    bloco: 'Torre A',
    apto: '11',
  });

  useEffect(() => {
    (async () => {
      try {
        const cached = await Storage.getSession();
        if (cached && cached.authenticated) {
          setSession(cached);
          setCurrentScreen('dashboard');
        }
      } catch (err) {
        console.warn('Failed to restore session', err);
      } finally {
        setLoading(false);
      }
    })();
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

  return (
    <View style={styles.container}>
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
});
