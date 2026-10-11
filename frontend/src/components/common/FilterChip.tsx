import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface FilterChipProps {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  count,
  selected,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.bgSubtle,
          borderColor: selected ? colors.primary : colors.borderDefault,
        },
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? '#FFFFFF' : colors.textSecondary,
            fontWeight: selected ? '700' : '500',
          },
        ]}
      >
        {label} {count !== undefined && count > 0 ? `(${count})` : ''}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    marginRight: 8,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
});
