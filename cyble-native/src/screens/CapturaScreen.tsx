import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { File, Paths } from 'expo-file-system';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Storage } from '../db/storage';
import { syncQueue } from '../db/syncQueue';
import { FotoCategoria, FotoLocal } from '../types';

interface Props {
  bloco: string;
  apartamento: string;
  onBack: () => void;
}

export const CapturaScreen: React.FC<Props> = ({ bloco, apartamento, onBack }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [categoria, setCategoria] = useState<FotoCategoria>('cyble_antes');
  const [capturing, setCapturing] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; acc?: number } | null>(null);

  const cameraRef = useRef<CameraView>(null);

  // Coletar GPS em segundo plano para o carimbo de auditoria
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setGpsCoords({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            acc: loc.coords.accuracy || undefined,
          });
        }
      } catch (err) {
        console.warn('GPS location unavailable', err);
      }
    })();
  }, []);

  const toggleTorch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTorch(prev => !prev);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Falha ao capturar imagem da câmera');
      }

      // Otimização e compressão nativa (max width 1600px para economizar banda mantendo nitidez)
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Salva arquivo permanentemente no diretório de documentos do app
      const timestamp = Date.now();
      const filename = `vistoria-${bloco}-${apartamento}-${categoria}-${timestamp}.jpg`;
      const targetFile = new File(Paths.document, filename);
      const sourceFile = new File(manipulated.uri);
      sourceFile.copy(targetFile);
      const targetUri = targetFile.uri;

      // Cria metadado da foto local
      const fotoLocal: FotoLocal = {
        id: `${bloco}-${apartamento}-${categoria}-${timestamp}`,
        uri: targetUri,
        bloco,
        apartamento,
        categoria,
        timestamp,
        latitude: gpsCoords?.lat,
        longitude: gpsCoords?.lng,
        accuracy: gpsCoords?.acc,
        status: 'pendente',
      };

      await Storage.saveFoto(fotoLocal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Dispara upload em background
      syncQueue.startSync();

      // Avança categoria automaticamente (Antes -> Depois -> Documento)
      if (categoria === 'cyble_antes') setCategoria('cyble_depois');
      else if (categoria === 'cyble_depois') setCategoria('documento');

      Alert.alert('Foto Salva!', `Foto registrada para ${bloco} - Apto ${apartamento}`);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro ao Salvar', err.message || 'Falha na captura');
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Feather name="camera-off" size={48} color={THEME.colors.danger} />
          <Text style={styles.permissionTitle}>Permissão de Câmera Necessária</Text>
          <Text style={styles.permissionText}>
            O aplicativo precisa acessar a câmera do dispositivo para fotografar os hidrômetros e documentos em campo.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Conceder Permissão</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={onBack}>
          <Feather name="arrow-left" size={22} color={THEME.colors.text} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.titleApto}>{bloco} - Apto {apartamento}</Text>
          <View style={styles.gpsBadge}>
            <Feather
              name="map-pin"
              size={12}
              color={gpsCoords ? THEME.colors.primary : THEME.colors.warning}
            />
            <Text style={styles.gpsText}>
              {gpsCoords ? `GPS ±${Math.round(gpsCoords.acc || 0)}m` : 'Buscando GPS...'}
            </Text>
          </View>
        </View>

        {/* Torch (Flash) Button */}
        <TouchableOpacity
          style={[styles.topBtn, torch && styles.torchActive]}
          onPress={toggleTorch}
        >
          <Feather
            name={torch ? 'zap' : 'zap-off'}
            size={22}
            color={torch ? '#0C0F14' : THEME.colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Native Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          enableTorch={torch}
          facing="back"
        />

        {/* Framing Guide Overlay */}
        <View style={styles.overlayFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      {/* Category Selector Tabs */}
      <View style={styles.categoryBar}>
        {(['cyble_antes', 'cyble_depois', 'documento'] as FotoCategoria[]).map(cat => {
          const isSelected = cat === categoria;
          const labels: Record<FotoCategoria, string> = {
            cyble_antes: 'Cyble Antes',
            cyble_depois: 'Cyble Depois',
            documento: 'Documento',
          };
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryTab, isSelected && styles.categoryTabSelected]}
              onPress={() => {
                Haptics.selectionAsync();
                setCategoria(cat);
              }}
            >
              <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                {labels[cat]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Shutter Action Bar */}
      <View style={styles.shutterBar}>
        <View style={{ width: 50 }} />

        <TouchableOpacity
          style={styles.shutterBtnOuter}
          activeOpacity={0.8}
          onPress={handleCapture}
          disabled={capturing}
        >
          <View style={styles.shutterBtnInner}>
            {capturing ? (
              <ActivityIndicator color={THEME.colors.primary} />
            ) : (
              <Feather name="camera" size={28} color={THEME.colors.primary} />
            )}
          </View>
        </TouchableOpacity>

        <View style={{ width: 50 }} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.background,
    zIndex: 10,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  torchActive: {
    backgroundColor: THEME.colors.warning,
    borderColor: THEME.colors.warning,
  },
  titleContainer: {
    alignItems: 'center',
  },
  titleApto: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  gpsText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlayFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: THEME.colors.primary,
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  categoryBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: THEME.colors.background,
    paddingVertical: 10,
    gap: 8,
    paddingHorizontal: 12,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  categoryTabSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  categoryTextSelected: {
    color: '#0C0F14',
  },
  shutterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: THEME.colors.background,
  },
  shutterBtnOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  permissionBtn: {
    marginTop: 24,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
  },
  permissionBtnText: {
    color: '#0C0F14',
    fontWeight: '700',
    fontSize: 15,
  },
});
