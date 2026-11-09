import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { api } from '../api/client';
import { Storage } from '../db/storage';
import { AuthSession } from '../types';

interface Props {
  onSuccess: (session: AuthSession) => void;
}

export const PinGateScreen: React.FC<Props> = ({ onSuccess }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMsg('');
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleConfirm = async () => {
    if (!pin) {
      setErrorMsg('Digite seu PIN');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Tenta validar com o backend oficial
      const res = await api.validatePin(pin);
      if (res.ok && res.role) {
        const session: AuthSession = { pin, role: res.role, authenticated: true };
        await Storage.setSession(session);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess(session);
        return;
      }

      // 2. Se offline, verifica se tem sessão local gravada
      const cached = await Storage.getSession();
      if (cached && cached.pin === pin) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess(cached);
        return;
      }

      // Senão erro
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMsg(res.error || 'PIN não autorizado');
    } catch {
      setErrorMsg('Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.badgeContainer}>
            <Feather name="shield" size={32} color={THEME.colors.primary} />
          </View>
          <Text style={styles.title}>Vistoria Cyble</Text>
          <Text style={styles.subtitle}>Aplicativo de Campo Nativo</Text>
        </View>

        {/* PIN Display */}
        <View style={styles.pinDisplayContainer}>
          <Text style={styles.pinLabel}>Informe o PIN de Acesso</Text>
          <View style={styles.dotsRow}>
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled,
                ]}
              />
            ))}
          </View>
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        </View>

        {/* Keypad */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['del', '0', 'ok'],
          ].map((row, rowIdx) => (
            <View key={rowIdx} style={styles.keypadRow}>
              {row.map(item => {
                if (item === 'del') {
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.key, styles.specialKey]}
                      onPress={handleDelete}
                      disabled={loading || pin.length === 0}
                    >
                      <Feather name="delete" size={24} color={THEME.colors.textMuted} />
                    </TouchableOpacity>
                  );
                }
                if (item === 'ok') {
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.key, styles.confirmKey]}
                      onPress={handleConfirm}
                      disabled={loading || pin.length === 0}
                    >
                      {loading ? (
                        <ActivityIndicator color="#0C0F14" />
                      ) : (
                        <Feather name="arrow-right" size={26} color="#0C0F14" />
                      )}
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={item}
                    style={styles.key}
                    onPress={() => handleKeyPress(item)}
                    disabled={loading}
                  >
                    <Text style={styles.keyText}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-around',
    paddingHorizontal: 28,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  badgeContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  pinDisplayContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  pinLabel: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  errorText: {
    color: THEME.colors.danger,
    fontSize: 13,
    marginTop: 8,
  },
  keypad: {
    gap: 14,
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialKey: {
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  confirmKey: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: THEME.colors.text,
  },
});
