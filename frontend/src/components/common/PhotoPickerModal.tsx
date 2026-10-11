import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { typography, spacing, radius, shadows } from '../../theme/tokens';

interface PhotoPickerModalProps {
  visible: boolean;
  hasCustomPhoto: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseLibrary: () => void;
  onRemovePhoto?: () => void;
  title?: string;
  subtitle?: string;
  removeTitle?: string;
  removeSubtitle?: string;
}

export const PhotoPickerModal: React.FC<PhotoPickerModalProps> = ({
  visible,
  hasCustomPhoto,
  onClose,
  onTakePhoto,
  onChooseLibrary,
  onRemovePhoto,
  title = 'Profile Photo',
  subtitle = 'Choose how you want to update your profile photo',
  removeTitle = 'Remove Photo',
  removeSubtitle = 'Revert back to your initials avatar',
}) => {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
              ]}
            >
              {/* Top Handle Bar */}
              <View style={[styles.handleBar, { backgroundColor: colors.borderDefault }]} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {subtitle}
                </Text>
              </View>

              {/* Action Options */}
              <View style={styles.optionsContainer}>
                {/* Take Photo */}
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    { backgroundColor: colors.bgScreen, borderColor: colors.borderLight },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    setTimeout(onTakePhoto, 150);
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="camera" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Take Photo</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                      Use camera to capture a new picture or document
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Choose from Library */}
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    { backgroundColor: colors.bgScreen, borderColor: colors.borderLight },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    setTimeout(onChooseLibrary, 150);
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="images" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Choose from Library</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                      Select an existing image from your gallery
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Remove Photo (if active) */}
                {hasCustomPhoto && onRemovePhoto && (
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      { backgroundColor: colors.bgScreen, borderColor: colors.borderLight },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      setTimeout(onRemovePhoto, 150);
                    }}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: colors.otpError.bg }]}>
                      <Ionicons name="trash-outline" size={22} color={colors.textError} />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionTitle, { color: colors.textError }]}>
                        {removeTitle}
                      </Text>
                      <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                        {removeSubtitle}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.bgSubtle }]}
                activeOpacity={0.8}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.xxl,
    ...shadows.modal,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.subtext,
  },
  optionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  optionSubtitle: {
    ...typography.caption,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...typography.bodyBold,
  },
});
