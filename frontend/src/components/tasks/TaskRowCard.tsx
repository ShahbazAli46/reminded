import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { Avatar } from '../common/Avatar';
import { PriorityLevel } from '../common/PriorityTag';
import { TaskStatus } from '../common/StatusBadge';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityTag } from '../common/PriorityTag';

export interface TaskItem {
  id: string;
  title: string;
  assignerName: string;
  assignerInitials: string;
  assigneeName: string;
  assigneeInitials: string;
  isCreatedByMe: boolean;
  dueDateText: string;
  dueAt?: string;
  completedAt?: string;
  remindBefore?: string[];
  deliveryStatus?: 'sent' | 'delivered' | 'notified' | 'opened';
  note?: string;
  lastMessage?: string;
  lastMessageStatus?: 'sent' | 'delivered' | 'read' | 'sending' | 'failed';
  status: TaskStatus;
  priority: PriorityLevel;
  attachmentName?: string;
  audioNoteDuration?: string;
  audioNoteUri?: string;
}

interface TaskRowCardProps {
  task: TaskItem;
  onPress: () => void;
}

/**
 * 3-Tier Delivery & Reminder Ticks:
 * 1. Single tick (✓) 'sent': Created & pushed to server.
 * 2. Double ticks (✓✓) 'delivered': Ingested & saved on recipient device.
 * 3. Triple ticks (✓✓✓) 'notified': Alarm popped up on recipient phone at scheduled due time!
 */
export const StatusTicks: React.FC<{
  status?: 'sent' | 'delivered' | 'notified' | 'opened' | 'read' | 'sending' | 'failed';
  size?: number;
}> = ({ status = 'sent', size = 14 }) => {
  const { colors } = useTheme();

  if (status === 'sending') {
    return <Ionicons name="time-outline" size={size} color={colors.textMuted} />;
  }

  // 3 Ticks (✓✓✓): Notified at scheduled time or Opened
  if (status === 'notified' || status === 'opened' || status === 'read') {
    const tickColor = status === 'opened' || status === 'read' ? colors.ticks.read : colors.primary;
    return (
      <View
        style={styles.tripleTicksRow}
        accessibilityLabel="Notified at scheduled time (3 ticks)"
      >
        <Ionicons name="checkmark-done" size={size} color={tickColor} />
        <Ionicons name="checkmark" size={size} color={tickColor} style={{ marginLeft: -8 }} />
      </View>
    );
  }

  // 2 Ticks (✓✓): Delivered
  if (status === 'delivered') {
    return (
      <View accessibilityLabel="Delivered (2 ticks)">
        <Ionicons name="checkmark-done" size={size} color={colors.ticks.delivered} />
      </View>
    );
  }

  // 1 Tick (✓): Sent
  return (
    <View accessibilityLabel="Sent (1 tick)">
      <Ionicons name="checkmark" size={size} color={colors.ticks.sent} />
    </View>
  );
};

export const TaskRowCard: React.FC<TaskRowCardProps> = ({ task, onPress }) => {
  const { colors } = useTheme();

  const personName = task.isCreatedByMe
    ? `To ${task.assigneeName}`
    : `From ${task.assignerName}`;

  const personInitials = task.isCreatedByMe
    ? task.assigneeInitials
    : task.assignerInitials;

  const priorityColor =
    task.priority === 'High'
      ? colors.priority.High.dot
      : task.priority === 'Medium'
      ? colors.priority.Medium.dot
      : colors.priority.Low.dot;

  const activeTickStatus = task.deliveryStatus || task.lastMessageStatus || 'sent';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.borderDefault,
        },
      ]}
      accessibilityRole="button"
    >
      {/* Top Meta & Badges Row */}
      <View style={styles.topMetaRow}>
        <View style={styles.personContainer}>
          <Avatar initials={personInitials} size={22} />
          <Text style={[styles.personNameText, { color: colors.textPrimary }]} numberOfLines={1}>
            {personName}
          </Text>
          <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
          <View style={styles.dueRow}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
            <Text style={[styles.dueDateText, { color: colors.textSecondary }]} numberOfLines={1}>
              {task.dueDateText}
            </Text>
            {task.isCreatedByMe ? (
              <View style={{ marginLeft: 6 }}>
                <StatusTicks status={activeTickStatus} size={13} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.badgeGroup}>
          <PriorityTag priority={task.priority} />
        </View>
      </View>

      {/* Main Title & Status */}
      <View style={styles.titleSection}>
        <Text style={[styles.titleText, { color: colors.textPrimary }]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.statusBadgeWrapper}>
          <StatusBadge status={task.status} />
        </View>
      </View>

      {/* Inset Note Preview */}
      {task.note ? (
        <View
          style={[
            styles.noteBox,
            {
              backgroundColor: colors.bgCardSubtle,
              borderLeftColor: priorityColor,
            },
          ]}
        >
          <Text style={[styles.noteText, { color: colors.textSecondary }]} numberOfLines={2}>
            {task.note}
          </Text>
        </View>
      ) : null}

      {/* Attachment Badges Row (Document / Voice Note) */}
      {task.attachmentName || task.audioNoteDuration ? (
        <View style={styles.attachmentsRow}>
          {task.attachmentName ? (
            <View
              style={[
                styles.attachmentChip,
                { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault },
              ]}
            >
              <Ionicons name="document-text" size={12} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.attachmentChipText, { color: colors.textSecondary }]} numberOfLines={1}>
                {task.attachmentName}
              </Text>
            </View>
          ) : null}

          {task.audioNoteDuration ? (
            <View
              style={[
                styles.attachmentChip,
                { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault },
              ]}
            >
              <Ionicons name="mic" size={12} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.attachmentChipText, { color: colors.textSecondary }]}>
                Voice note ({task.audioNoteDuration})
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Chat Footer with snippet & read receipt ticks */}
      {task.lastMessage ? (
        <View style={[styles.lastMessageRow, { borderTopColor: colors.borderLight }]}>
          <View style={styles.messageContent}>
            <Ionicons
              name="chatbubble-ellipses"
              size={13}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.lastMessageText, { color: colors.textSecondary }]} numberOfLines={1}>
              {task.lastMessage}
            </Text>
          </View>
          <View style={styles.checkWrapper}>
            <StatusTicks status={task.lastMessageStatus || activeTickStatus} size={15} />
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    padding: 15,
    marginVertical: 5,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  personContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  personNameText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  metaDot: {
    marginHorizontal: 5,
    fontSize: 11,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  dueDateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 8,
  },
  statusBadgeWrapper: {
    marginTop: 1,
  },
  noteBox: {
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderLeftWidth: 3,
    marginVertical: 4,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
  },
  attachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 4,
  },
  attachmentChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  lastMessageText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  checkWrapper: {
    marginLeft: 4,
  },
  tripleTicksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
