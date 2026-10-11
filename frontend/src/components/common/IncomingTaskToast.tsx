import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../theme/useTheme';
import { Avatar } from './Avatar';
import { typography, spacing, radius, shadows } from '../../theme/tokens';

export const IncomingTaskToast: React.FC = () => {
  const { incomingTaskToast, dismissIncomingTaskToast, selectTask } = useAppStore();
  const { colors } = useTheme();

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (incomingTaskToast.visible && incomingTaskToast.task) {
      // Slide in from top
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 6000);

      return () => clearTimeout(timer);
    } else {
      slideAnim.setValue(-120);
      opacityAnim.setValue(0);
    }
  }, [incomingTaskToast.visible, incomingTaskToast.task]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissIncomingTaskToast();
    });
  };

  const handleViewTask = () => {
    if (incomingTaskToast.task) {
      const taskId = incomingTaskToast.task.id;
      handleDismiss();
      selectTask(taskId);
    }
  };

  if (!incomingTaskToast.visible || !incomingTaskToast.task) {
    return null;
  }

  const task = incomingTaskToast.task;

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[
          styles.toastCard,
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.borderDefault,
            shadowColor: '#000000',
          },
        ]}
        activeOpacity={0.9}
        onPress={handleViewTask}
        accessibilityRole="alert"
        accessibilityLabel={`New reminder from ${task.assignerName}: ${task.title}`}
      >
        <View style={styles.leftRow}>
          <Avatar initials={task.assignerInitials || 'CO'} size={38} />
          <View style={styles.infoCol}>
            <View style={styles.headerBadgeRow}>
              <Text style={[styles.assignerName, { color: colors.textPrimary }]} numberOfLines={1}>
                {task.assignerName} assigned a task
              </Text>
              <View style={[styles.priorityBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.priorityText, { color: colors.primary }]}>{task.priority}</Text>
              </View>
            </View>

            <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {task.title}
            </Text>

            <View style={styles.dueRow}>
              <Ionicons name="time-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.dueText, { color: colors.textSecondary }]} numberOfLines={1}>
                Due: {task.dueDateText}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtonsCol}>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: colors.primary }]}
            onPress={handleViewTask}
            accessibilityRole="button"
            accessibilityLabel="View task details"
          >
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification banner"
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.xs : spacing.lg,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.modal,
    elevation: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  infoCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  assignerName: {
    ...typography.caption,
    fontWeight: '600',
    flexShrink: 1,
    marginRight: spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  taskTitle: {
    ...typography.bodyBold,
    fontSize: 14,
    lineHeight: 18,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dueText: {
    ...typography.caption,
    fontSize: 11,
  },
  actionButtonsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  viewButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginRight: spacing.xs,
  },
  viewButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
});
