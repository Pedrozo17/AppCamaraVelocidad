import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ReportScreen({ navigation, route }) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const cameraRef = useRef(null);

  const [coords, setCoords] = useState(route.params?.currentLocation ?? null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    description: '',
    street: '',
    speed_limit: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);
      if (granted && !coords) {
        fetchCurrentLocation();
      }
    } catch (error) {
      console.error('Error verificando permiso de ubicación:', error);
    }
  };

  const fetchCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission(false);
        Alert.alert(
          'Permiso de ubicación denegado',
          'Para crear un reporte necesitamos saber dónde está la cámara. Habilita la ubicación en Configuración.',
        );
        return;
      }
      setLocationPermission(true);

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      // Autocompletar la calle con reverse geocoding
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (address) {
        const streetName = [address.street, address.city].filter(Boolean).join(', ');
        if (streetName) {
          setForm((prev) => ({ ...prev, street: streetName }));
        }
      }
    } catch (error) {
      Alert.alert(
        'Error de ubicación',
        'No se pudo obtener la ubicación actual. Verifica que el GPS esté activo.',
        [
          { text: 'Reintentar', onPress: fetchCurrentLocation },
          { text: 'Continuar sin GPS' },
        ],
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          'Permiso de cámara denegado',
          'SpeedCam necesita acceso a la cámara para fotografiar la cámara de velocidad. Ve a Configuración > Privacidad > Cámara para habilitarlo.',
        );
        return;
      }
    }
    setCameraActive(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo) {
        setCapturedPhoto(photo.uri);
        setCameraActive(false);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
      console.error('Camera error:', error);
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setCameraActive(true);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.street.trim()) {
      newErrors.street = 'Ingresa la calle o avenida donde está la cámara';
    }
    if (!form.description.trim()) {
      newErrors.description = 'Agrega una descripción de la cámara';
    } else if (form.description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    }
    if (form.speed_limit && isNaN(Number(form.speed_limit))) {
      newErrors.speed_limit = 'Ingresa solo números para el límite de velocidad';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    if (!capturedPhoto) {
      Alert.alert(
        'Foto requerida',
        '¿Deseas enviar el reporte sin foto de evidencia?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar sin foto', onPress: saveReport },
        ],
      );
      return;
    }

    await saveReport();
  };

  const saveReport = async () => {
    setIsSaving(true);
    try {
      let finalCoords = coords;
      if (!finalCoords) {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          finalCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      }

      if (!finalCoords) {
        Alert.alert(
          'Sin coordenadas',
          'No se pudo determinar la ubicación del reporte. Habilita el GPS e inténtalo de nuevo.',
        );
        setIsSaving(false);
        return;
      }

      const newReport = {
        id: Date.now().toString(),
        latitude: finalCoords.latitude,
        longitude: finalCoords.longitude,
        description: form.description.trim(),
        street: form.street.trim(),
        timestamp: new Date().toISOString(),
        speed_limit: form.speed_limit ? Number(form.speed_limit) : null,
        photo: capturedPhoto || null,
        reported_by: 'Tú',
      };
      const existing = await AsyncStorage.getItem('reports');
      const reports = existing ? JSON.parse(existing) : [];

      const updatedReports = [newReport, ...reports];

      await AsyncStorage.setItem('reports', JSON.stringify(updatedReports));
      // Simular guardado (aquí iría tu API o AsyncStorage)
      await new Promise((resolve) => setTimeout(resolve, 800));

      navigation.navigate('Map', { newReport });
    } catch (error) {
      Alert.alert('Error al guardar', 'Ocurrió un error. Por favor intenta de nuevo.');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────
  // Vista de cámara activa
  // ─────────────────────────────────────
  if (cameraActive) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" />
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraTopBar}>
              <TouchableOpacity onPress={() => setCameraActive(false)} style={styles.cameraBackBtn}>
                <Text style={styles.cameraBackText}>✕ Cancelar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cameraGuide}>
              <View style={styles.guideCorner} />
              <Text style={styles.guideText}>Encuadra la cámara de velocidad</Text>
            </View>
            <View style={styles.cameraBottomBar}>
              <TouchableOpacity style={styles.shutterButton} onPress={takePhoto}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // ─────────────────────────────────────
  // Formulario principal
  // ─────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo reporte</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Foto */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Evidencia fotográfica</Text>
          {capturedPhoto ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: capturedPhoto }} style={styles.photoImage} />
              <TouchableOpacity onPress={retakePhoto} style={styles.retakeBtn}>
                <Text style={styles.retakeBtnText}>📷 Retomar foto</Text>
              </TouchableOpacity>
              {coords && (
                <View style={styles.gpsTag}>
                  <Text style={styles.gpsTagText}>
                    📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.photoPlaceholder} onPress={openCamera}>
              <Text style={styles.photoPlaceholderIcon}>📷</Text>
              <Text style={styles.photoPlaceholderText}>Toca para fotografiar</Text>
              <Text style={styles.photoPlaceholderSub}>
                {cameraPermission?.granted
                  ? 'La foto ayuda a otros usuarios a identificar la cámara'
                  : 'Se requiere permiso de cámara'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* GPS */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Ubicación GPS</Text>
            <TouchableOpacity onPress={fetchCurrentLocation} disabled={isGettingLocation}>
              {isGettingLocation ? (
                <ActivityIndicator size="small" color="#58a6ff" />
              ) : (
                <Text style={styles.refreshBtn}>↻ Actualizar</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={[styles.coordsBox, !coords && styles.coordsBoxWarning]}>
            {coords ? (
              <>
                <Text style={styles.coordsText}>
                  📍 {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                </Text>
                <Text style={styles.coordsHint}>Coordenadas obtenidas correctamente</Text>
              </>
            ) : locationPermission === false ? (
              <>
                <Text style={styles.coordsWarning}>⚠️ Permiso de GPS denegado</Text>
                <TouchableOpacity onPress={fetchCurrentLocation}>
                  <Text style={styles.coordsAction}>Solicitar permiso nuevamente</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.coordsWarning}>
                {isGettingLocation ? 'Obteniendo ubicación...' : 'Sin coordenadas aún'}
              </Text>
            )}
          </View>
        </View>

        {/* Formulario */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Detalles del reporte</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Calle / Avenida *</Text>
            <TextInput
              style={[styles.input, errors.street ? styles.inputError : null]}
              placeholder="Ej: Av. El Dorado con Cra 68"
              placeholderTextColor="#484f58"
              value={form.street}
              onChangeText={(v) => {
                setForm((prev) => ({ ...prev, street: v }));
                if (errors.street) setErrors((prev) => ({ ...prev, street: undefined }));
              }}
              maxLength={100}
            />
            {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Descripción *</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, errors.description ? styles.inputError : null]}
              placeholder="Ej: Cámara fija sobre el semáforo, mide velocidad en ambos carriles"
              placeholderTextColor="#484f58"
              value={form.description}
              onChangeText={(v) => {
                setForm((prev) => ({ ...prev, description: v }));
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              multiline
              numberOfLines={3}
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{form.description.length}/300</Text>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Límite de velocidad (opcional)</Text>
            <View style={styles.speedInputRow}>
              <TextInput
                style={[styles.input, styles.speedInput, errors.speed_limit ? styles.inputError : null]}
                placeholder="Ej: 60"
                placeholderTextColor="#484f58"
                value={form.speed_limit}
                onChangeText={(v) => {
                  setForm((prev) => ({ ...prev, speed_limit: v }));
                  if (errors.speed_limit) setErrors((prev) => ({ ...prev, speed_limit: undefined }));
                }}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.kmhLabel}>km/h</Text>
            </View>
            {errors.speed_limit && <Text style={styles.errorText}>{errors.speed_limit}</Text>}
          </View>
        </View>

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonLoading]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#0a0a0a" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Publicar reporte 📡</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0d1117',
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: { width: 70 },
  backText: { color: '#58a6ff', fontSize: 14 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#f0f6fc' },
  scrollView: { backgroundColor: '#0d1117' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },
  section: { gap: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  refreshBtn: { fontSize: 13, color: '#58a6ff' },
  photoPlaceholder: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#30363d',
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  photoPlaceholderIcon: { fontSize: 32 },
  photoPlaceholderText: { fontSize: 15, fontWeight: '500', color: '#f0f6fc' },
  photoPlaceholderSub: {
    fontSize: 12,
    color: '#8b949e',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  photoPreview: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: 220 },
  retakeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  retakeBtnText: { fontSize: 12, color: '#fff' },
  gpsTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  gpsTagText: { fontSize: 10, color: '#58a6ff' },
  coordsBox: {
    backgroundColor: '#161b22',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#21262d',
    padding: 14,
    gap: 4,
  },
  coordsBoxWarning: { borderColor: '#f0883e' },
  coordsText: { fontSize: 13, color: '#58a6ff', fontFamily: 'monospace' },
  coordsHint: { fontSize: 11, color: '#484f58' },
  coordsWarning: { fontSize: 13, color: '#f0883e' },
  coordsAction: { fontSize: 12, color: '#58a6ff', marginTop: 4 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, color: '#c9d1d9', fontWeight: '500' },
  input: {
    backgroundColor: '#161b22',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363d',
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#f0f6fc',
  },
  inputMultiline: { minHeight: 80, paddingTop: 12 },
  inputError: { borderColor: '#f85149' },
  speedInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  speedInput: { width: 90 },
  kmhLabel: { fontSize: 14, color: '#8b949e' },
  charCount: { fontSize: 11, color: '#484f58', textAlign: 'right', marginTop: 2 },
  errorText: { fontSize: 12, color: '#f85149' },
  saveButton: {
    backgroundColor: '#58a6ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonLoading: { backgroundColor: '#21262d' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#0a0a0a' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraTopBar: { paddingTop: 56, paddingHorizontal: 20 },
  cameraBackBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cameraBackText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  cameraGuide: { alignItems: 'center', gap: 12 },
  guideCorner: {
    width: 220,
    height: 160,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(88,166,255,0.8)',
    backgroundColor: 'transparent',
  },
  guideText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  cameraBottomBar: { paddingBottom: 48, alignItems: 'center' },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
});