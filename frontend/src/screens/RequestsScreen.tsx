import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, ReminderRequest } from '../store/useAppStore';
import { useTheme } from '../theme/useTheme';
import { Avatar } from '../components/common/Avatar';
import { PriorityTag } from '../components/common/PriorityTag';
import { BottomTabBar } from '../components/navigation/BottomTabBar';
import { getInitials } from '../utils/initials';

export const RequestsScreen: React.FC = () => {
  const {
    pendingRequests,
    approveRequest,
    declineRequest,
    blockRequest,
    navigateTo,
    profileName,
    profilePhoto,
    currentUser,
  } = useAppStore();

  const { colors } = useTheme();

  const displayName = currentUser?.name || profileName || 'Shahbaz Ali';
  const initials = getInitials(displayName);

  const handleApprove = (req: ReminderRequest) => {
    approveRequest(req.id);
    Alert.alert(
      'Request Approved',
      `${req.senderName} has been added to your trusted contacts and their reminder is now in your active list.`,
      [{ text: 'View Reminders', onPress: () => navigateTo('TaskList') }]
    );
  };

  const handleDecline = (req: ReminderRequest) => {
    Alert.alert(
      'Decline Reminder Request',
      `Decline reminder "${req.taskTitle}" from ${req.senderName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => declineRequest(req.id),
        },
      ]
    );
  };

  const handleBlock = (req: ReminderRequest) => {
    Alert.alert(
      'Block Sender',
      `Are you sure you want to block ${req.senderName} (${req.senderPhone})? They will never be able to send you reminders again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block & Report',
          style: 'destructive',
          onPress: () => blockRequest(req.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      {/* 1. Header: Identical to Home Screen ("Reminded" on left, Avatar "SA" on right) */}
      <View style={[styles.headerContainer, { backgroundColor: colors.bgScreen }]}>
        <Text style={[styles.appTitle, { color: colors.primary }]}>Reminded</Text>

        <TouchableOpacity
          onPress={() => navigateTo('Profile')}
          style={styles.avatarButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open profile and settings"
        >
          <Avatar
            initials={initials}
            source={profilePhoto ? { uri: profilePhoto } : undefined}
            size={36}
          />
        </TouchableOpacity>
      </View>

      {/* 2. Scrollable Requests Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Header */}
        <View style={styles.titleRow}>
          <Text style={[styles.screenHeading, { color: colors.textPrimary }]}>
            Reminder Requests
          </Text>
          {pendingRequests.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                {pendingRequests.length} Pending
              </Text>
            </View>
          )}
        </View>

        {pendingRequests.length > 0 ? (
          <>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              These senders are not yet in your trusted contacts. Review their reminder requests below:
            </Text>

            {pendingRequests.map((req) => (
              <View
                key={req.id}
                style={[
                  styles.requestCard,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderDefault,
                  },
                ]}
              >
                {/* Sender Header */}
                <View style={styles.senderHeader}>
                  <Avatar initials={req.senderInitials} size={44} />
                  <View style={styles.senderInfo}>
                    <Text style={[styles.senderName, { color: colors.textPrimary }]}>
                      {req.senderName}
                    </Text>
                    <Text style={[styles.senderPhone, { color: colors.textSecondary }]}>
                      {req.senderPhone}
                    </Text>
                  </View>
                  <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                    {req.requestedAt}
                  </Text>
                </View>

                {/* Reminder Content Box */}
                <View
                  style={[
                    styles.taskBox,
                    {
                      backgroundColor: colors.bgCardSubtle,
                      borderColor: colors.borderDefault,
                    },
                  ]}
                >
                  <View style={styles.taskMetaRow}>
                    <View style={styles.dueRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.dueText, { color: colors.textSecondary }]}>
                        {req.taskDueDate}
                      </Text>
                    </View>
                    <PriorityTag priority={req.taskPriority} />
                  </View>

                  <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>
                    {req.taskTitle}
                  </Text>
                  <Text style={[styles.taskDetails, { color: colors.textSecondary }]}>
                    {req.taskDetails}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                  <View style={styles.primaryActionRow}>
                    <TouchableOpacity
                      style={[styles.approveButton, { backgroundColor: colors.primary }]}
                      activeOpacity={0.8}
                      onPress={() => handleApprove(req)}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.approveButtonText}>Approve & Add</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.declineButton,
                        {
                          backgroundColor: colors.bgSubtle,
                          borderColor: colors.borderDefault,
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleDecline(req)}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={18}
                        color={colors.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.declineButtonText, { color: colors.textSecondary }]}>
                        Decline
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.blockButton}
                    activeOpacity={0.7}
                    onPress={() => handleBlock(req)}
                  >
                    <Ionicons
                      name="hand-left-outline"
                      size={14}
                      color={colors.textError}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.blockButtonText, { color: colors.textError }]}>
                      Block this sender
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="checkmark-done" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              All Caught Up
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              You don't have any pending reminder requests. Incoming tasks from new senders will appear here.
            </Text>
            <TouchableOpacity
              style={[styles.backHomeButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={() => navigateTo('TaskList')}
            >
              <Text style={styles.backHomeButtonText}>Back to Reminders</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 3. Fixed Bottom Tab Bar */}
      <BottomTabBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  appTitle: {
    fontFamily: 'Roboto_500Medium',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  avatarButton: {
    padding: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  senderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '700',
  },
  senderPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
  },
  taskBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskDetails: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionsContainer: {
    gap: 8,
  },
  primaryActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  blockButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  backHomeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  backHomeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
