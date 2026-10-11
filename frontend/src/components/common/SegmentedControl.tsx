import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography, radius, spacing, fontFamily } from '../../theme/tokens';

interface SegmentedControlProps<T extends string> {
  options: T[];
  selectedIndex: number;
  badgeCounts?: (number | undefined)[];
  onChange: (index: number) => void;
}

export function SegmentedControl<T extends string>({
  options,
  selectedIndex,
  badgeCounts,
  onChange,
}: SegmentedControlProps<T>) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        const count = badgeCounts?.[index] ?? 0;
        const hasBadge = count > 0;

        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.8}
            onPress={() => onChange(index)}
            style={[styles.segment, isSelected && styles.selectedSegment]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            <View style={styles.segmentContentRow}>
              <Text
                style={[
                  styles.segmentText,
                  isSelected ? styles.selectedText : styles.defaultText,
                ]}
              >
                {option}
              </Text>

              {hasBadge && (
                <View style={styles.badgeWrapper}>
                  {isSelected && (
                    <Animated.View
                      style={[
                        styles.pulsingDot,
                        {
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    />
                  )}
                  <View
                    style={[
                      styles.badgePill,
                      isSelected ? styles.badgePillActive : styles.badgePillInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeCountText,
                        isSelected ? styles.badgeTextActive : styles.badgeTextInactive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 14,
    padding: 4,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSegment: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  segmentContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  defaultText: {
    color: colors.textSecondary,
  },
  selectedText: {
    color: colors.textPrimary,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    position: 'relative',
  },
  pulsingDot: {
    position: 'absolute',
    left: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.4,
  },
  badgePill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgePillActive: {
    backgroundColor: colors.primary,
  },
  badgePillInactive: {
    backgroundColor: '#E2E8F0',
  },
  badgeCountText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    includeFontPadding: false,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  badgeTextInactive: {
    color: colors.textSecondary,
  },
});

