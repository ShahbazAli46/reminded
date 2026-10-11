import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

interface AvatarProps {
  initials?: string;
  source?: ImageSourcePropType;
  size?: number;
  showCameraBadge?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  source,
  size = 48,
  showCameraBadge = false,
  onPress,
  accessibilityLabel,
}) => {
  const { colors, isDark } = useTheme();

  const fontSize = Math.round(size * 0.38);
  const badgeSize = Math.max(24, Math.round(size * 0.28));
  const badgeIconSize = Math.max(12, Math.round(badgeSize * 0.52));

  const content = (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDark ? '#202C33' : '#E9EDEF',
          borderColor: isDark ? '#2A3942' : '#D1D7DB',
        },
        !source && !initials ? styles.avatarContainerEmpty : null,
      ]}
    >
      {source ? (
        <Image
          source={source}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : initials ? (
        <Text
          style={[
            styles.initialsText,
            {
              fontSize,
              color: isDark ? '#E9EDEF' : '#54656F',
            },
          ]}
        >
          {initials}
        </Text>
      ) : (
        <Ionicons name="person" size={size * 0.5} color={colors.textMuted} />
      )}

      {showCameraBadge && (
        <View
          style={[
            styles.badgeContainer,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: colors.primary,
              borderColor: colors.bgSurface,
            },
          ]}
        >
          <Ionicons name="camera" size={badgeIconSize} color="#FFFFFF" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Change photo'}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarContainerEmpty: {
    opacity: 0.8,
  },
  initialsText: {
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: -0.2,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
