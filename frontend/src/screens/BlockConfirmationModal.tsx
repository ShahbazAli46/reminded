import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { colors, typography, spacing } from '../theme/tokens';
import { Button } from '../components/common/Button';
import { ModalShell } from '../components/common/ModalShell';

export const BlockConfirmationModal: React.FC = () => {
  const { showBlockModal, closeBlockModal } = useAppStore();

  return (
    <ModalShell
      visible={showBlockModal}
      onClose={closeBlockModal}
      variant="center"
    >
      <View style={styles.content}>
        <Text style={styles.title}>Block Hamza Malik?</Text>
        <Text style={styles.subtitle}>
          They will no longer be able to send you reminders or messages. You can unblock them anytime.
        </Text>

        <View style={styles.buttonRow}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={closeBlockModal}
            style={styles.halfBtn}
          />
          <View style={{ width: spacing.md }} />
          <Button
            title="Block"
            variant="danger"
            onPress={() => {
              closeBlockModal();
            }}
            style={styles.halfBtn}
          />
        </View>
      </View>
    </ModalShell>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
  },
  halfBtn: {
    flex: 1,
  },
});
