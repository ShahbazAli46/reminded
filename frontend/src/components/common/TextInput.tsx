import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps as RNTextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, radius, spacing, fontFamily } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  subtext?: string;
  error?: string;
  countryCode?: string;
  flag?: string;
  onCountryCodePress?: () => void;
  containerStyle?: ViewStyle;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  subtext,
  error,
  countryCode,
  flag = '🇵🇰',
  onCountryCodePress,
  containerStyle,
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return colors.borderError;
    if (isFocused) return colors.borderFocused;
    return colors.borderDefault;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {countryCode && (
          <TouchableOpacity
            style={[
              styles.countryPicker,
              {
                backgroundColor: colors.bgInput,
                borderColor: colors.borderDefault,
              },
            ]}
            onPress={onCountryCodePress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Country code ${countryCode}`}
          >
            <View style={[styles.flagContainer, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.flagText, { color: colors.primary }]}>{flag}</Text>
            </View>
            <Text style={[styles.countryCodeText, { color: colors.textPrimary }]}>{countryCode}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={styles.chevron} />
          </TouchableOpacity>
        )}
        <RNTextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.bgInput,
              borderColor: getBorderColor(),
              borderWidth: isFocused ? 1.5 : 1,
              color: colors.textPrimary,
            },
            countryCode ? styles.inputWithCountry : null,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.textError }]}>{error}</Text>
      ) : subtext ? (
        <Text style={[styles.subtextText, { color: colors.textMuted }]}>{subtext}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    width: '100%',
  },
  label: {
    ...typography.subtextBold,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
  },
  flagContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  flagText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
  countryCodeText: {
    ...typography.bodyBold,
  },
  chevron: {
    marginLeft: 4,
  },
  input: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    ...typography.body,
  },
  inputWithCountry: {
    flex: 1,
  },
  subtextText: {
    ...typography.subtext,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.subtext,
    marginTop: spacing.xs,
  },
});
