import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { spacing, fontFamily } from '../../theme/tokens';

export type PriorityLevel = 'High' | 'Medium' | 'Low';

interface PriorityTagProps {
  priority: PriorityLevel;
}

export const PriorityTag: React.FC<PriorityTagProps> = ({ priority }) => {
  const { colors } = useTheme();
  const config = colors.priority[priority] || colors.priority.Low;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, { color: config.text }]}>{priority}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    letterSpacing: -0.1,
  },
});
