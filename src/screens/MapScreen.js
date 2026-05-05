import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

const MOCK_REPORTS = [
  {
    id: '1',
    latitude: 4.6534,
    longitude: -74.0836,
    description: 'Cámara fija, velocidad máxima 60 km/h',
    street: 'Av. El Dorado con Cra 50',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    speed_limit: 60,
    reported_by: 'Usuario #1',
  },
  {
    id: '2',
    latitude: 4.6751,
    longitude: -74.0479,
    description: 'Fotomulta en curva peligrosa',
    street: 'Cra 7 con Cl 72',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    speed_limit: 50,
    reported_by: 'Usuario #2',
  },
  {
    id: '3',
    latitude: 4.6097,
    longitude: -74.0817,
    description: 'Radar móvil, cambia de posición frecuentemente',
    street: 'Autopista Sur con Cl 40 Sur',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    speed_limit: null,
    reported_by: 'Usuario #3',
  },
];

export default function MapScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Si volvemos de ReportScreen con un nuevo reporte, lo agregamos
  useEffect(() => {
    if (route.params?.newReport) {
      setReports((prev) => [route.params.newReport, ...prev]);
      navigation.setParams({ newReport: null });
    }
  }, [route.params?.newReport]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const stored = await AsyncStorage.getItem('reports');
      if (stored) {
        setReports(JSON.parse(stored));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const requestLocationPermission = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setPermissionDenied(true);
        setIsLoadingLocation(false);
        Alert.alert(
          'Permiso de ubicación denegado',
          'SpeedCam necesita acceder a tu ubicación para mostrarte cámaras cercanas.\n\nVe a Configuración > Privacidad > Ubicación para habilitarlo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Reintentar', onPress: requestLocationPermission },
          ],
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      setPermissionDenied(false);

      mapRef.current?.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      Alert.alert(
        'Error de ubicación',
        'No se pudo obtener tu ubicación. Verifica que el GPS esté habilitado.',
        [{ text: 'Reintentar', onPress: requestLocationPermission }, { text: 'OK' }],
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleMarkerPress = (report) => {
    setSelectedReport(report);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

const closePanel = () => {
  Animated.spring(slideAnim, {
    toValue: 120,
    useNativeDriver: true,
  }).start(() => setSelectedReport(null));
};
  const centerOnUser = () => {
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      });
    } else {
      requestLocationPermission();
    }
  };

  const formatTimestamp = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    return `Hace ${Math.floor(hrs / 24)} días`;
  };

  const defaultRegion = {
    latitude: location?.coords.latitude ?? 4.6534,
    longitude: location?.coords.longitude ?? -74.0836,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SpeedCam</Text>
          <Text style={styles.headerSub}>{reports.length} cámaras reportadas</Text>
        </View>
        <View style={styles.headerRight}>
          {isLoadingLocation && <ActivityIndicator size="small" color="#58a6ff" />}
          {permissionDenied && (
            <TouchableOpacity onPress={requestLocationPermission} style={styles.permissionBtn}>
              <Text style={styles.permissionBtnText}>📍 Habilitar GPS</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={defaultRegion}
        showsUserLocation={!permissionDenied}
        showsMyLocationButton={false}
      >
        {reports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            onPress={() => handleMarkerPress(report)}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerEmoji}>📷</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Botón centrar */}
      <TouchableOpacity style={styles.locateButton} onPress={centerOnUser}>
        <Text style={styles.locateButtonText}>📍</Text>
      </TouchableOpacity>

      {/* Botón agregar reporte */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() =>
          navigation.navigate('Report', {
            currentLocation: location
              ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
              : null,
          })
        }
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {/* Panel detalle */}
      {selectedReport && (
        <Animated.View style={[styles.detailPanel, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.panelHandle} />
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelStreet}>{selectedReport.street}</Text>
            <TouchableOpacity onPress={closePanel}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedReport.photo && (
            <Image
              source={{ uri: selectedReport.photo }}
              style={{ width: '100%', height: 150, borderRadius: 10 }}
            />
          )}
          {selectedReport.speed_limit && (
            <View style={styles.speedBadge}>
              <Text style={styles.speedBadgeText}>🚗 {selectedReport.speed_limit} km/h</Text>
            </View>
          )}
          <Text style={styles.panelDescription}>{selectedReport.description}</Text>
          <View style={styles.panelMeta}>
            <Text style={styles.panelMetaText}>⏱ {formatTimestamp(selectedReport.timestamp)}</Text>
            <Text style={styles.panelMetaText}>👤 {selectedReport.reported_by}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fa' },
  header: {
    backgroundColor: '#0d1117',
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f0f6fc',
    letterSpacing: -0.4,
  },
  headerSub: { fontSize: 12, color: '#8b949e', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permissionBtn: {
    backgroundColor: '#1c2333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0883e',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  permissionBtnText: { fontSize: 12, color: '#f0883e', fontWeight: '500' },
  map: { flex: 1 },
  markerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#0d1117',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerEmoji: { fontSize: 18 },
  locateButton: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d7de',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  locateButtonText: { fontSize: 20 },
  addButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#58a6ff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  addButtonText: { fontSize: 28, fontWeight: '300', color: '#0a0a0a', lineHeight: 32 },
  detailPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#161b22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: '#21262d',
    gap: 12,
  },
  panelHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#30363d',
    alignSelf: 'center',
    marginBottom: 4,
  },
  panelTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelStreet: { fontSize: 17, fontWeight: '600', color: '#f0f6fc', flex: 1 },
  closeBtn: { fontSize: 16, color: '#8b949e', paddingLeft: 12 },
  speedBadge: {
    backgroundColor: '#2d1a00',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f0883e',
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  speedBadgeText: { fontSize: 12, color: '#f0883e', fontWeight: '500' },
  panelDescription: { fontSize: 14, color: '#8b949e', lineHeight: 22 },
  panelMeta: { flexDirection: 'row', gap: 16 },
  panelMetaText: { fontSize: 12, color: '#484f58' },
});