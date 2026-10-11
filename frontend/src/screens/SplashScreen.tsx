import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { colors, typography, spacing } from '../theme/tokens';
import { Button } from '../components/common/Button';

export const SplashScreen: React.FC = () => {
  const { isOffline, setOffline, appControl, checkAppControl, authToken, navigateTo } = useAppStore();

  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      await checkAppControl();
      setTimeout(() => {
        if (!isMounted) return;
        const currentControl = useAppStore.getState().appControl;
        if (currentControl?.isMaintenance || currentControl?.isForceUpdate) {
          // Stay on splash screen to display maintenance/update banner
          return;
        }
        if (authToken) {
          navigateTo('TaskList');
        } else {
          navigateTo('PhoneEntry');
        }
      }, 1500);
    };

    if (!isOffline) {
      initApp();
    }
    return () => {
      isMounted = false;
    };
  }, [isOffline]);

  if (appControl?.isMaintenance) {
    return (
      <SafeAreaView style={[styles.container, styles.bgOffline]}>
        <View style={styles.centerContent}>
          <View style={styles.logoBadgePurple}>
            <Ionicons name="construct-outline" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.offlineTitle}>{appControl.maintenanceTitle || 'Under Maintenance'}</Text>
          <Text style={styles.offlineSubtext}>{appControl.maintenanceMessage || 'Please check back shortly.'}</Text>
          <Button
            title="Check Again"
            onPress={() => checkAppControl()}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (appControl?.isForceUpdate) {
    return (
      <SafeAreaView style={[styles.container, styles.bgOffline]}>
        <View style={styles.centerContent}>
          <View style={styles.logoBadgePurple}>
            <Ionicons name="cloud-download-outline" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.offlineTitle}>{appControl.updateTitle || 'Update Required'}</Text>
          <Text style={styles.offlineSubtext}>{appControl.updateMessage || 'Please update to the latest version to continue.'}</Text>
          <Button
            title="Update Now"
            onPress={() => {
              // Open store URL
            }}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isOffline ? styles.bgOffline : styles.bgDefault]}>
      {!isOffline ? (
        // DEFAULT SPLASH STATE (Image 1-splash.png) - Tapping proceeds to Phone Entry
        <TouchableWithoutFeedback onPress={() => navigateTo(authToken ? 'TaskList' : 'PhoneEntry')}>
          <View style={styles.centerContent}>
            <View style={styles.logoBadgeWhite}>
              <Ionicons name="notifications" size={32} color={colors.primary} />
            </View>
            <Text style={styles.logoTextWhite}>remindd</Text>
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>

            <View style={styles.bottomFooterContainer}>
              <Text style={styles.footerTextWhite}>Checking your session...</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      ) : (
        // OFFLINE SPLASH STATE (Image 2-splash-offline.png)
        <View style={styles.centerContent}>
          <View style={styles.logoBadgePurple}>
            <Ionicons name="notifications" size={32} color="#FFFFFF" />
          </View>

          <View style={styles.offlineIconContainer}>
            <MaterialCommunityIcons name="wifi-off" size={28} color={colors.textMuted} />
          </View>

          <Text style={styles.offlineTitle}>Couldn't check your session</Text>
          <Text style={styles.offlineSubtext}>
            Check your connection and try again.
          </Text>

          <Button
            title="Retry"
            onPress={() => setOffline(false)}
            style={styles.retryButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgDefault: {
    backgroundColor: colors.primary,
  },
  bgOffline: {
    backgroundColor: colors.bgScreen,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  logoBadgeWhite: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoTextWhite: {
    ...typography.h1,
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: spacing.xxl,
  },
  spinnerContainer: {
    marginVertical: spacing.lg,
  },
  bottomFooterContainer: {
    position: 'absolute',
    bottom: 40,
  },
  footerTextWhite: {
    ...typography.subtext,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Offline elements
  logoBadgePurple: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  offlineIconContainer: {
    marginBottom: spacing.md,
  },
  offlineTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  offlineSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 120,
  },
});
