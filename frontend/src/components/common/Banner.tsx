import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../../theme/tokens';

interface BannerProps {
  variant: 'info' | 'warning';
  message: string;
  actionText?: string;
  onActionPress?: () => void;
  onDismiss?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const Banner: React.FC<BannerProps> = ({
  variant,
  message,
  actionText,
  onActionPress,
  onDismiss,
  icon,
}) => {
  const config = colors.banner[variant];
  const iconName = icon || (variant === 'info' ? 'person-add' : 'warning');

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <View style={styles.contentRow}>
        <Ionicons name={iconName} size={18} color={config.text} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: config.text }]}>
            {message}{' '}
            {actionText && (
              <Text
                style={[styles.actionLink, { color: config.link }]}
                onPress={onActionPress}
              >
                {actionText}
              </Text>
            )}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Ionicons name="close" size={16} color={config.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    ...typography.subtextBold,
    lineHeight: 18,
  },
  actionLink: {
    ...typography.subtextBold,
    textDecorationLine: 'underline',
  },
  closeButton: {
    padding: 4,
    marginLeft: spacing.xs,
  },
});
