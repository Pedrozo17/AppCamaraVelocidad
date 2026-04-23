import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
  ActivityIndicator,
  StatusBar,
  Animated,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export default function LoginScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkBiometricAvailability();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricAvailable(compatible && enrolled);

      if (!compatible) {
        Alert.alert(
          'Dispositivo no compatible',
          'Este dispositivo no cuenta con sensor biométrico.',
        );
      } else if (!enrolled) {
        Alert.alert(
          'Sin biometría registrada',
          'Configura Face ID o huella dactilar en los ajustes del dispositivo.',
        );
      }
    } catch (error) {
      console.error('Error verificando biometría:', error);
    }
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleAuthentication = async () => {
    if (!isBiometricAvailable) {
      Alert.alert(
        'Biometría no disponible',
        'Configura Face ID o huella dactilar en los ajustes del dispositivo.',
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verifica tu identidad para ingresar a SpeedCam',
        fallbackLabel: 'Usar contraseña',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        navigation.replace('Map');
      } else {
        const newCount = attemptCount + 1;
        setAttemptCount(newCount);

        // Vibración como feedback de error
        Vibration.vibrate([0, 200, 100, 200]);
        triggerShake();

        if (result.error === 'user_cancel') {
          // El usuario canceló voluntariamente, no mostrar error
        } else if (newCount >= 3) {
          Alert.alert(
            'Demasiados intentos fallidos',
            'Has fallado la autenticación varias veces. Inténtalo de nuevo en unos minutos.',
            [{ text: 'OK', onPress: () => setAttemptCount(0) }],
          );
        } else {
          Alert.alert(
            'Autenticación fallida',
            `No se pudo verificar tu identidad. Intento ${newCount} de 3.`,
            [
              { text: 'Reintentar', onPress: handleAuthentication },
              { text: 'Cancelar' },
            ],
          );
        }
      }
    } catch (error) {
      Vibration.vibrate(400);
      Alert.alert(
        'Error de autenticación',
        'Ocurrió un error inesperado. Por favor intenta de nuevo.',
      );
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>📷</Text>
          </View>
          <Text style={styles.appName}>SpeedCam</Text>
          <Text style={styles.tagline}>Reporta cámaras de velocidad</Text>
        </View>

        {/* Card de autenticación */}
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={styles.cardTitle}>Acceso seguro</Text>
          <Text style={styles.cardSubtitle}>
            Usa tu <Text style={styles.highlight}>Face ID</Text> o{' '}
            <Text style={styles.highlight}>huella dactilar</Text> para ingresar
          </Text>

          <TouchableOpacity
            style={[styles.authButton, !isBiometricAvailable && styles.authButtonDisabled]}
            onPress={handleAuthentication}
            disabled={isLoading || !isBiometricAvailable}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#0a0a0a" size="small" />
            ) : (
              <>
                <Text style={styles.authButtonIcon}>
                  {isBiometricAvailable ? '🔒' : '🚫'}
                </Text>
                <Text style={styles.authButtonText}>
                  {isBiometricAvailable ? 'Autenticar con biometría' : 'Biometría no disponible'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {attemptCount > 0 && (
            <View style={styles.attemptBadge}>
              <Text style={styles.attemptText}>⚠️ Intento fallido {attemptCount}/3</Text>
            </View>
          )}

          <Text style={styles.infoNote}>
            La autenticación protege tus reportes y datos de ubicación.
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#1c2333',
    borderWidth: 1,
    borderColor: '#2d3748',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoIcon: { fontSize: 32 },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f0f6fc',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#8b949e',
    letterSpacing: 0.3,
  },
  card: {
    width: '100%',
    backgroundColor: '#161b22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#21262d',
    padding: 28,
    gap: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f0f6fc',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#8b949e',
    lineHeight: 22,
  },
  highlight: {
    color: '#58a6ff',
    fontWeight: '600',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#58a6ff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 8,
  },
  authButtonDisabled: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  authButtonIcon: { fontSize: 18 },
  authButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0a0a0a',
  },
  attemptBadge: {
    backgroundColor: '#2d1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f85149',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  attemptText: {
    fontSize: 12,
    color: '#f85149',
    textAlign: 'center',
  },
  infoNote: {
    fontSize: 12,
    color: '#484f58',
    textAlign: 'center',
    lineHeight: 18,
  },
});