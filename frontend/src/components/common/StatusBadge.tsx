import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { spacing, fontFamily } from '../../theme/tokens';

export type TaskStatus =
  | 'Upcoming'
  | 'Pending'
  | 'Done, pending confirmation'
  | 'Completed'
  | 'Cancelled'
  | 'Awaiting Acceptance'
  | 'Declined';

interface StatusBadgeProps {
  status: TaskStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { colors } = useTheme();
  const getBadgeColors = () => {
    switch (status) {
      case 'Upcoming':
        return colors.status.Upcoming;
      case 'Pending':
        return colors.status.Pending;
      case 'Done, pending confirmation':
        return colors.status.DonePending;
      case 'Completed':
        return colors.status.Completed;
      case 'Cancelled':
        return colors.status.Cancelled;
      case 'Awaiting Acceptance':
        return colors.status.AwaitingAcceptance;
      case 'Declined':
        return colors.status.Declined;
      default:
        return colors.status.Pending;
    }
  };

  const currentConfig = getBadgeColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: currentConfig.bg,
          borderColor: currentConfig.border,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: currentConfig.dot }]} />
      <Text style={[styles.text, { color: currentConfig.text }]}>{status}</Text>
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
    marginRight: 5,
  },
  text: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    letterSpacing: -0.1,
  },
});
