import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { typography, radius, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const { colors, isDark } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.bgSubtle,
          borderColor: colors.borderDefault,
          borderWidth: 1,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          minHeight: 44,
          paddingHorizontal: spacing.md,
        };
      case 'danger':
        return {
          backgroundColor: colors.priority.High.bg,
        };
      case 'primary':
      default:
        return disabled
          ? {
              backgroundColor: isDark ? '#1F2937' : '#E2E8F0',
              borderWidth: 1,
              borderColor: isDark ? '#2D3748' : '#CBD5E1',
            }
          : {
              backgroundColor: colors.primary,
            };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return {
          ...typography.bodyBold,
          color: colors.textPrimary,
        };
      case 'text':
        return {
          ...typography.bodyBold,
          color: colors.textLink,
        };
      case 'danger':
        return {
          ...typography.bodyBold,
          color: colors.priority.High.text,
        };
      case 'primary':
      default:
        return disabled
          ? {
              ...typography.bodyBold,
              color: isDark ? '#64748B' : '#94A3B8',
            }
          : {
              ...typography.bodyBold,
              color: colors.primaryTextOnDark,
            };
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.baseButton,
        getContainerStyle(),
        disabled && styles.disabledOpacity,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.primaryTextOnDark : colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), textStyle, icon ? { marginLeft: spacing.xs } : null]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    minHeight: 48,
    minWidth: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabledOpacity: {
    opacity: 0.6,
  },
});
