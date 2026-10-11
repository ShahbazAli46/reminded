import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { colors, typography, spacing } from '../theme/tokens';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { ModalShell } from '../components/common/ModalShell';

export const IncomingRequestModal: React.FC = () => {
  const {
    showIncomingModal,
    closeIncomingModal,
    dismissIncomingBanner,
    openBlockModal,
  } = useAppStore();

  const handleAccept = () => {
    dismissIncomingBanner();
    closeIncomingModal();
  };

  const handleDecline = () => {
    closeIncomingModal();
  };

  return (
    <ModalShell
      visible={showIncomingModal}
      onClose={closeIncomingModal}
      variant="bottomSheet"
    >
      <View style={styles.content}>
        <View style={styles.avatarWrapper}>
          <Avatar initials="HM" size={72} />
        </View>

        <Text style={styles.title}>
          Hamza Malik wants to send you reminders
        </Text>

        <Text style={styles.subtitle}>
          If you accept, they can share reminders and tasks with you by phone number.
          No account needed on either side.
        </Text>

        <Text style={styles.phoneText}>+92 345 1122334</Text>

        <View style={styles.buttonRow}>
          <Button
            title="Decline"
            variant="secondary"
            onPress={handleDecline}
            style={styles.halfBtn}
          />
          <View style={{ width: spacing.md }} />
          <Button
            title="Accept"
            onPress={handleAccept}
            style={styles.halfBtn}
          />
        </View>

        <TouchableOpacity
          onPress={() => {
            closeIncomingModal();
            openBlockModal();
          }}
          style={styles.blockLinkContainer}
          accessibilityRole="button"
          accessibilityLabel="Block this number"
        >
          <Text style={styles.blockLinkText}>Block this number</Text>
        </TouchableOpacity>
      </View>
    </ModalShell>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatarWrapper: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    lineHeight: 28,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  phoneText: {
    ...typography.subtextBold,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: spacing.lg,
  },
  halfBtn: {
    flex: 1,
  },
  blockLinkContainer: {
    paddingVertical: spacing.xs,
  },
  blockLinkText: {
    ...typography.subtextBold,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
