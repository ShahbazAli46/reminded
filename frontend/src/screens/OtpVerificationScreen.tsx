import React, { useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { OtpInputGroup } from '../components/otp/OtpInputGroup';

export const OtpVerificationScreen: React.FC = () => {
  const {
    phoneNumber,
    otpCode,
    setOtpCode,
    otpError,
    setOtpError,
    resendCountdown,
    decrementCountdown,
    resetCountdown,
    verifyOtp,
    sendOtp,
    navigateTo,
  } = useAppStore();

  useEffect(() => {
    const timer = setInterval(() => {
      decrementCountdown();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = async (val: string) => {
    setOtpCode(val);
    if (val.length === 6) {
      const result = await verifyOtp(val);
      if (result.success) {
        navigateTo('ProfileSetup');
      }
    }
  };

  const formattedPhone = phoneNumber || '+92 301 2345678';

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.innerContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => navigateTo('PhoneEntry')}
                style={styles.backButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>Enter the code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {formattedPhone}.
            </Text>

            <OtpInputGroup
              value={otpCode}
              onChange={handleOtpChange}
              hasError={otpError}
              errorMessage="That code doesn't look right. Try again."
              resendCountdown={resendCountdown}
              onResendPress={() => {
                resetCountdown();
                setOtpCode('');
                if (phoneNumber) sendOtp(phoneNumber);
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgScreen,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  title: {
    ...typography.h1,
    fontSize: 28,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
});
