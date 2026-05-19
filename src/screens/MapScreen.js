import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, StatusBar, Animated, ActivityIndicator, Image,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CAMARAS_COLOMBIA } from '../generarcanaras';

export default function MapScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [userReports, setUserReports] = useState([]);
  const [region, setRegion] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    requestLocationPermission();
    loadUserReports();
  }, []);

  useEffect(() => {
    if (route.params?.newReport) {
      setUserReports((prev) => [route.params.newReport, ...prev]);
      navigation.setParams({ newReport: null });
    }
  }, [route.params?.newReport]);

  const loadUserReports = async () => {
    try {
      const stored = await AsyncStorage.getItem('reports');
      if (stored) setUserReports(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  };

  const markersVisibles = useMemo(() => {
    const todos = [...CAMARAS_COLOMBIA, ...userReports];
    if (!region) return todos.slice(0, 40);

    const margen = 1.5;
    const enRegion = todos.filter((r) =>
      r.latitude >= region.latitude - region.latitudeDelta * margen &&
      r.latitude <= region.latitude + region.latitudeDelta * margen &&
      r.longitude >= region.longitude - region.longitudeDelta * margen &&
      r.longitude <= region.longitude + region.longitudeDelta * margen
    );

    return enRegion.slice(0, 100);
  }, [region, userReports]);

  const requestLocationPermission = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setIsLoadingLocation(false);
        Alert.alert(
          'Permiso denegado',
          'Habilita la ubicación para ver cámaras cercanas.',
          [{ text: 'Cancelar' }, { text: 'Reintentar', onPress: requestLocationPermission }]
        );
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
      setPermissionDenied(false);
      mapRef.current?.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleMarkerPress = (report) => {
    setSelectedReport(report);
    Animated.spring(slideAnim, {
      toValue: 0, tension: 65, friction: 10, useNativeDriver: true,
    }).start();
  };

  const closePanel = () => {
    Animated.spring(slideAnim, {
      toValue: 120, useNativeDriver: true,
    }).start(() => setSelectedReport(null));
  };

  const centerOnUser = () => {
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
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
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SpeedCam</Text>
          <Text style={styles.headerSub}>
            {CAMARAS_COLOMBIA.length} cámaras · mostrando {markersVisibles.length}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isLoadingLocation && <ActivityIndicator size="small" color="#58a6ff" />}
          {permissionDenied && (
            <TouchableOpacity onPress={requestLocationPermission} style={styles.permissionBtn}>
              <Text style={styles.permissionBtnText}>📍 GPS</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={!permissionDenied}
        showsMyLocationButton={false}
        onRegionChangeComplete={(r) => setRegion(r)}
        moveOnMarkerPress={false}
      >
        {markersVisibles.map((report) => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            onPress={() => handleMarkerPress(report)}
            pinColor="#58a6ff"
            tracksViewChanges={false}
          />
        ))}
      </MapView>

      <TouchableOpacity style={styles.locateButton} onPress={centerOnUser}>
        <Text style={styles.locateButtonText}>📍</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('Report', {
          currentLocation: location
            ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
            : null,
        })}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

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
            <Image source={{ uri: selectedReport.photo }}
              style={{ width: '100%', height: 150, borderRadius: 10 }} />
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
    backgroundColor: '#0d1117', paddingTop: 52, paddingBottom: 14,
    paddingHorizontal: 20, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#f0f6fc', letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: '#8b949e', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permissionBtn: {
    backgroundColor: '#1c2333', borderRadius: 8, borderWidth: 1,
    borderColor: '#f0883e', paddingVertical: 6, paddingHorizontal: 10,
  },
  permissionBtnText: { fontSize: 12, color: '#f0883e', fontWeight: '500' },
  map: { flex: 1 },
  locateButton: {
    position: 'absolute', bottom: 110, right: 20, width: 48, height: 48,
    borderRadius: 12, backgroundColor: '#fff', borderWidth: 1,
    borderColor: '#d0d7de', justifyContent: 'center', alignItems: 'center', elevation: 4,
  },
  locateButtonText: { fontSize: 20 },
  addButton: {
    position: 'absolute', bottom: 40, right: 20, width: 56, height: 56,
    borderRadius: 16, backgroundColor: '#58a6ff',
    justifyContent: 'center', alignItems: 'center', elevation: 8,
  },
  addButtonText: { fontSize: 28, fontWeight: '300', color: '#0a0a0a', lineHeight: 32 },
  detailPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#161b22', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#21262d', gap: 12,
  },
  panelHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#30363d', alignSelf: 'center', marginBottom: 4,
  },
  panelTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelStreet: { fontSize: 17, fontWeight: '600', color: '#f0f6fc', flex: 1 },
  closeBtn: { fontSize: 16, color: '#8b949e', paddingLeft: 12 },
  speedBadge: {
    backgroundColor: '#2d1a00', borderRadius: 6, borderWidth: 1,
    borderColor: '#f0883e', paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start',
  },
  speedBadgeText: { fontSize: 12, color: '#f0883e', fontWeight: '500' },
  panelDescription: { fontSize: 14, color: '#8b949e', lineHeight: 22 },
  panelMeta: { flexDirection: 'row', gap: 16 },
  panelMetaText: { fontSize: 12, color: '#484f58' },
});