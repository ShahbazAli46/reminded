import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import { radius, shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

interface ModalShellProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: 'bottomSheet' | 'center';
  contentStyle?: ViewStyle;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  visible,
  onClose,
  children,
  variant = 'bottomSheet',
  contentStyle,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={variant === 'bottomSheet' ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                variant === 'bottomSheet' ? styles.bottomSheet : styles.centerModal,
                { backgroundColor: colors.bgSurface },
                contentStyle,
              ]}
            >
              {variant === 'bottomSheet' && (
                <View style={[styles.handle, { backgroundColor: colors.borderDefault }]} />
              )}
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    ...shadows.modal,
  },
  centerModal: {
    borderRadius: radius.xl,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
    ...shadows.modal,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
