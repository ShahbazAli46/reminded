import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../theme/useTheme';

export const BottomTabBar: React.FC = () => {
  const {
    currentScreen,
    segmentIndex,
    setSegmentIndex,
    navigateTo,
    pendingRequests,
    tasks,
  } = useAppStore();

  const { colors } = useTheme();

  const blinkAnim = useRef(new Animated.Value(1)).current;
  const hasPendingRequests = pendingRequests.length > 0;

  useEffect(() => {
    if (hasPendingRequests) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      blink.start();
      return () => blink.stop();
    }
  }, [hasPendingRequests, blinkAnim]);

  // Calculate assigned tasks count
  const assignedCount = tasks.filter((t) => !t.isCreatedByMe && t.status !== 'Completed').length;

  // Determine active tab:
  // 0 = Assigned, 1 = Created, 2 = Requests, 3 = Profile
  const getActiveTabIndex = () => {
    if (currentScreen === 'Requests') return 2;
    if (currentScreen === 'Profile') return 3;
    if (currentScreen === 'TaskList') {
      return segmentIndex === 0 ? 0 : 1;
    }
    return 0;
  };

  const activeIndex = getActiveTabIndex();

  const handleTabPress = (index: number) => {
    if (index === 0) {
      setSegmentIndex(0);
      if (currentScreen !== 'TaskList') navigateTo('TaskList');
    } else if (index === 1) {
      setSegmentIndex(1);
      if (currentScreen !== 'TaskList') navigateTo('TaskList');
    } else if (index === 2) {
      navigateTo('Requests');
    } else if (index === 3) {
      navigateTo('Profile');
    }
  };

  const tabs = [
    {
      id: 'assigned',
      label: 'Assigned',
      iconFilled: 'checkbox' as const,
      iconOutline: 'checkbox-outline' as const,
      badgeCount: assignedCount > 0 ? assignedCount : undefined,
    },
    {
      id: 'created',
      label: 'Created',
      iconFilled: 'send' as const,
      iconOutline: 'send-outline' as const,
      badgeCount: undefined,
    },
    {
      id: 'requests',
      label: 'Requests',
      iconFilled: 'notifications' as const,
      iconOutline: 'notifications-outline' as const,
      hasBlinkDot: hasPendingRequests,
    },
    {
      id: 'profile',
      label: 'Profile',
      iconFilled: 'person' as const,
      iconOutline: 'person-outline' as const,
      badgeCount: undefined,
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bottomBarBg,
          borderTopColor: colors.bottomBarBorder,
        },
      ]}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeIndex === idx;

        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.7}
            onPress={() => handleTabPress(idx)}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={isActive ? tab.iconFilled : tab.iconOutline}
                size={23}
                color={isActive ? colors.primary : colors.tabInactive}
              />

              {/* Number Badge */}
              {tab.badgeCount !== undefined && (
                <View style={[styles.badgePill, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{tab.badgeCount}</Text>
                </View>
              )}

              {/* Blinking Red Dot on Requests Bottom Tab */}
              {tab.hasBlinkDot && (
                <Animated.View
                  style={[
                    styles.blinkingDot,
                    {
                      opacity: blinkAnim,
                    },
                  ]}
                />
              )}
            </View>

            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? colors.primary : colors.tabInactive,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 26,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  badgePill: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    includeFontPadding: false,
  },
  blinkingDot: {
    position: 'absolute',
    top: -2,
    right: -5,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
