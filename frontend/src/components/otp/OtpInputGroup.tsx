import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TouchableOpacity,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing, fontFamily } from '../../theme/tokens';

interface OtpInputGroupProps {
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
  errorMessage?: string;
  resendCountdown?: number;
  onResendPress?: () => void;
}

export const OtpInputGroup: React.FC<OtpInputGroupProps> = ({
  value,
  onChange,
  hasError = false,
  errorMessage,
  resendCountdown = 0,
  onResendPress,
}) => {
  const inputs = useRef<Array<RNTextInput | null>>([]);

  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleChangeText = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    let newValue = value.split('');

    if (cleanText.length > 1) {
      // Pasted full code
      const pasted = cleanText.slice(0, 6);
      onChange(pasted);
      inputs.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }

    newValue[index] = cleanText;
    const updatedString = newValue.join('').trim();
    onChange(updatedString);

    if (cleanText && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.boxesRow}>
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const digit = digits[index] || '';
          const isFocused = value.length === index;

          return (
            <RNTextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[
                styles.box,
                hasError
                  ? styles.boxError
                  : isFocused
                  ? styles.boxFocused
                  : digit
                  ? styles.boxFilled
                  : styles.boxDefault,
                hasError && styles.textError,
              ]}
              value={digit}
              onChangeText={(text) => handleChangeText(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              accessibilityLabel={`Digit ${index + 1}`}
            />
          );
        })}
      </View>

      {hasError ? (
        <View style={styles.errorRow}>
          <Ionicons
            name="information-circle"
            size={14}
            color={colors.textError}
            style={styles.errorIcon}
          />
          <Text style={styles.errorMessageText}>
            {errorMessage || "That code doesn't look right. Try again."}
          </Text>
        </View>
      ) : null}

      <View style={styles.resendContainer}>
        {resendCountdown > 0 ? (
          <Text style={styles.countdownText}>
            Resend code in 0:{resendCountdown < 10 ? `0${resendCountdown}` : resendCountdown}
          </Text>
        ) : (
          <TouchableOpacity
            onPress={onResendPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Resend code"
          >
            <Text style={styles.resendLinkText}>Resend code</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.lg,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: radius.md,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  boxDefault: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  boxFocused: {
    borderWidth: 1.5,
    borderColor: colors.borderFocused,
  },
  boxFilled: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  boxError: {
    backgroundColor: colors.otpError.bg,
    borderWidth: 1,
    borderColor: colors.otpError.border,
    color: colors.otpError.text,
  },
  textError: {
    color: colors.otpError.text,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  errorIcon: {
    marginRight: 6,
  },
  errorMessageText: {
    ...typography.subtextBold,
    color: colors.textError,
  },
  resendContainer: {
    marginTop: spacing.lg,
  },
  countdownText: {
    ...typography.subtext,
    color: colors.textMuted,
  },
  resendLinkText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});
