import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { typography, spacing, radius, shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { TextInput } from '../components/common/TextInput';
import { TextArea } from '../components/common/TextArea';
import { PriorityLevel } from '../components/common/PriorityTag';
import * as ImagePicker from 'expo-image-picker';
import { Image, Alert } from 'react-native';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';
import { ContactPickerSheet } from './ContactPickerSheet';
import { DateTimePickerModal } from '../components/common/DateTimePickerModal';
import { PhotoPickerModal } from '../components/common/PhotoPickerModal';
import {
  DocumentScannerModal,
  ScannedPhotoResult,
} from '../components/common/DocumentScannerModal';
import {
  VoiceNoteRecorder,
  AudioNoteData,
} from '../components/common/VoiceNoteRecorder';
import { getInitials } from '../utils/initials';
import { CryptoService } from '../services/cryptoService';
import { api } from '../services/apiClient';

interface CreateTaskScreenProps {
  onBack?: () => void;
}

export const CreateTaskScreen: React.FC<CreateTaskScreenProps> = ({ onBack }) => {
  const {
    profileName,
    currentUser,
    selectedContact,
    addTask,
    navigateTo,
    setSelectedContact,
  } = useAppStore();
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [selectedRemindBefore, setSelectedRemindBefore] = useState<string[]>(['15 min', '5 min']);
  const [showContactSheet, setShowContactSheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo & Scanner state
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [rawImageUri, setRawImageUri] = useState<string | null>(null);
  const [attachedPhoto, setAttachedPhoto] = useState<ScannedPhotoResult | null>(null);

  // Audio Note state
  const [audioNote, setAudioNote] = useState<AudioNoteData | null>(null);

  // Date & Time selection state
  const [formattedDueText, setFormattedDueText] = useState('Today · 5:00 PM');
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    return d;
  });

  // Assignee registration status
  const [isRecipientRegistered, setIsRecipientRegistered] = useState<boolean | null>(null);
  const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null);

  const handleGoBack = () => {
    setSelectedContact(null);
    if (onBack) {
      onBack();
    } else {
      navigateTo('TaskList');
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (selectedContact?.phone) {
      setIsRecipientRegistered(null);
      api
        .checkNumber(selectedContact.phone)
        .then((res) => {
          if (isMounted && res?.success && res?.data) {
            setIsRecipientRegistered(Boolean(res.data.isRegistered));
            setRecipientPublicKey(res.data.user?.publicKey || null);
          }
        })
        .catch(() => {
          if (isMounted) setIsRecipientRegistered(false);
        });
    } else {
      setIsRecipientRegistered(null);
      setRecipientPublicKey(null);
    }
    return () => {
      isMounted = false;
    };
  }, [selectedContact]);

  const toggleRemindBefore = (option: string) => {
    if (selectedRemindBefore.includes(option)) {
      setSelectedRemindBefore(selectedRemindBefore.filter((o) => o !== option));
    } else {
      setSelectedRemindBefore([...selectedRemindBefore, option]);
    }
  };

  const handleTakePhoto = async () => {
    setShowPhotoPicker(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is required to take pictures of documents.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setRawImageUri(result.assets[0].uri);
      setShowScannerModal(true);
    }
  };

  const handleChooseLibrary = async () => {
    setShowPhotoPicker(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery access is required to choose an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setRawImageUri(result.assets[0].uri);
      setShowScannerModal(true);
    }
  };

  const handleRemovePhoto = () => {
    setShowPhotoPicker(false);
    setAttachedPhoto(null);
    setRawImageUri(null);
  };

  const handleScannerAttach = (result: ScannedPhotoResult) => {
    setAttachedPhoto(result);
    setShowScannerModal(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !selectedContact) return;
    setIsSubmitting(true);

    try {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 1. Calculate due timestamp
      const dueTimestamp = scheduledDate || new Date(Date.now() + 24 * 60 * 60 * 1000);

      // 2. Encrypt payload with task key (Zero-Knowledge E2EE)
      const taskKey = CryptoService.generateTaskKey();
      const encPayload = await CryptoService.encryptText(
        JSON.stringify({ title: title.trim(), details: details.trim() || '' }),
        taskKey
      );

      // 3. Post to backend API
      const apiPriority = priority.toLowerCase() as 'low' | 'medium' | 'high';
      api.createTask({
        id: taskId,
        title: title.trim(),
        note: details.trim() || undefined,
        attachmentName: attachedPhoto ? attachedPhoto.fileName : undefined,
        audioNoteDuration: audioNote ? audioNote.durationText : undefined,
        assigneePhone: selectedContact.phone,
        assigneeName: selectedContact.name,
        encryptedTaskKeyForCreator: CryptoService.toHex(taskKey),
        encryptedPayload: encPayload.ciphertext,
        payloadIv: encPayload.iv,
        priority: apiPriority,
        dueAt: dueTimestamp.toISOString(),
        dueDateText: formattedDueText,
        remindBefore: selectedRemindBefore,
      }).catch((err) => {
        console.warn('API task creation background sync note:', err.message);
      });

      // 4. Add to local store immediately (offline-first)
      addTask({
        title: title.trim(),
        assignerName: (currentUser?.name || profileName).split(' ')[0],
        assignerInitials: getInitials(currentUser?.name || profileName),
        assigneeName: selectedContact.name,
        assigneeInitials: selectedContact.initials,
        isCreatedByMe: true,
        dueDateText: formattedDueText,
        dueAt: dueTimestamp.toISOString(),
        remindBefore: selectedRemindBefore,
        note: details.trim() || undefined,
        status: 'Upcoming',
        priority,
        attachmentName: attachedPhoto ? attachedPhoto.fileName : undefined,
        audioNoteDuration: audioNote ? audioNote.durationText : undefined,
        audioNoteUri: audioNote ? audioNote.uri : undefined,
      });

      setSelectedContact(null);
      setIsSubmitting(false);
      handleGoBack();
    } catch (err) {
      console.error('Task creation error:', err);
      setSelectedContact(null);
      setIsSubmitting(false);
      handleGoBack();
    }
  };

  const isValid =
    title.trim().length > 0 &&
    selectedContact !== null &&
    Boolean(formattedDueText) &&
    !isSubmitting;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <KeyboardAvoidingView
        style={styles.innerContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Screen Header with Back Arrow */}
        <View style={[styles.headerRow, { backgroundColor: colors.bgCard, borderBottomColor: colors.borderDefault }]}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>New reminder</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Remind Contact Field (clean without invite links) */}
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Remind</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.pickerBox,
              { backgroundColor: colors.bgInput, borderColor: colors.borderDefault },
            ]}
            onPress={() => setShowContactSheet(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              selectedContact
                ? `Remind ${selectedContact.name}`
                : 'Choose who to remind'
            }
          >
            {selectedContact ? (
              <View style={styles.selectedContactRow}>
                <Avatar initials={selectedContact.initials} size={36} />
                <View style={styles.selectedContactText}>
                  <Text style={[styles.contactName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {selectedContact.name}
                  </Text>
                  <Text style={[styles.contactPhone, { color: colors.textSecondary }]} numberOfLines={1}>
                    {selectedContact.phone}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderRow}>
                <Ionicons
                  name="person-add"
                  size={18}
                  color={colors.primary}
                  style={styles.pickerIcon}
                />
                <Text style={[styles.pickerPlaceholderText, { color: colors.textMuted }]}>
                  Choose who to remind
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Title Input */}
          <TextInput
            label="Title"
            placeholder="e.g. Pick up dry cleaning"
            value={title}
            onChangeText={setTitle}
          />

          {/* Details Textarea */}
          <TextArea
            label="Details (optional)"
            placeholder="Add any instructions, invoice numbers, or notes..."
            value={details}
            onChangeText={setDetails}
          />

          {/* Date & Time Field */}
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Date & time</Text>
          <TouchableOpacity
            style={[
              styles.pickerBox,
              { backgroundColor: colors.bgInput, borderColor: colors.borderDefault },
            ]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Date and time, ${formattedDueText}`}
          >
            <View style={styles.placeholderRow}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.primary}
                style={styles.pickerIcon}
              />
              <Text style={[styles.pickerValueText, { color: colors.textPrimary }]} numberOfLines={1}>
                {formattedDueText}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Priority Pill Group */}
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Priority</Text>
          <View style={[styles.priorityContainer, { backgroundColor: colors.bgSubtle }]}>
            {(['Low', 'Medium', 'High'] as PriorityLevel[]).map((level) => {
              const isSelected = priority === level;
              return (
                <TouchableOpacity
                  key={level}
                  onPress={() => setPriority(level)}
                  style={[
                    styles.priorityPill,
                    isSelected
                      ? [styles.prioritySelectedPill, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]
                      : styles.priorityDefaultPill,
                  ]}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Priority ${level}`}
                >
                  <Text
                    style={[
                      styles.priorityPillText,
                      isSelected
                        ? [styles.prioritySelectedText, { color: colors.primary }]
                        : [styles.priorityDefaultText, { color: colors.textSecondary }],
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Photo Attachment Section */}
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Photo (optional)</Text>
          {attachedPhoto ? (
            <TouchableOpacity
              style={[
                styles.photoPreviewCard,
                { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
              ]}
              onPress={() => setShowPhotoPicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.photoAttachedRow}>
                <Image
                  source={{ uri: attachedPhoto.uri }}
                  style={styles.attachedThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.photoAttachedInfo}>
                  <Text style={[styles.photoTitleText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {attachedPhoto.fileName}
                  </Text>
                  <View style={styles.badgeRow}>
                    <Ionicons
                      name={attachedPhoto.mode === 'scanned' ? 'sparkles' : 'image'}
                      size={12}
                      color={colors.primary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.photoSubtext, { color: colors.primary }]}>
                      {attachedPhoto.mode === 'scanned' ? 'CamScanner Clean' : 'Original Photo'}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setAttachedPhoto(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.addPhotoDashedBox,
                { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
              ]}
              onPress={() => setShowPhotoPicker(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Attach photo or document"
            >
              <Ionicons
                name="camera-outline"
                size={22}
                color={colors.primary}
                style={styles.addPhotoIcon}
              />
              <Text style={[styles.addPhotoText, { color: colors.textPrimary }]}>
                Attach photo or document
              </Text>
            </TouchableOpacity>
          )}

          {/* Voice Note Section */}
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Voice note (optional)</Text>
          <VoiceNoteRecorder
            audioData={audioNote}
            onSaveAudio={(data) => setAudioNote(data)}
            onRemoveAudio={() => setAudioNote(null)}
          />

          {/* Remind me before Multi-select */}
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Remind me before</Text>
          <View style={styles.chipGroupRow}>
            {['15 min', '10 min', '5 min'].map((option) => {
              const isSelected = selectedRemindBefore.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => toggleRemindBefore(option)}
                  style={[
                    styles.remindChip,
                    isSelected
                      ? [styles.remindChipSelected, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]
                      : [styles.remindChipDefault, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }],
                  ]}
                  activeOpacity={0.8}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Remind ${option} before`}
                  accessibilityState={{ checked: isSelected }}
                >
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={colors.primary}
                      style={styles.remindChipCheck}
                    />
                  )}
                  <Text
                    style={[
                      styles.remindChipText,
                      isSelected
                        ? [styles.remindChipTextSelected, { color: colors.primary }]
                        : [styles.remindChipTextDefault, { color: colors.textSecondary }],
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer Create Button */}
        <View style={[styles.footer, { backgroundColor: colors.bgCard, borderTopColor: colors.borderDefault }]}>
          <Button
            title={isSubmitting ? 'Creating reminder...' : 'Create reminder'}
            onPress={handleCreate}
            disabled={!isValid}
            style={styles.createButton}
          />
        </View>

        {/* Contact Picker Sheet Modal */}
        <ContactPickerSheet
          visible={showContactSheet}
          onClose={() => setShowContactSheet(false)}
        />

        {/* Date & Time Picker Modal */}
        <DateTimePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onApply={(scheduleText, exactDate) => {
            setFormattedDueText(scheduleText);
            setScheduledDate(exactDate);
          }}
          initialDate={scheduledDate}
        />

        {/* Photo Picker Modal (Camera vs Library) */}
        <PhotoPickerModal
          visible={showPhotoPicker}
          hasCustomPhoto={Boolean(attachedPhoto)}
          onClose={() => setShowPhotoPicker(false)}
          onTakePhoto={handleTakePhoto}
          onChooseLibrary={handleChooseLibrary}
          onRemovePhoto={handleRemovePhoto}
          title="Attach Photo or Document"
          subtitle="Capture a new paper document or select from gallery"
          removeTitle="Remove Attachment"
          removeSubtitle="Delete the currently attached photo"
        />

        {/* Document Scanner Preview Screen (Original vs Scanned) */}
        <DocumentScannerModal
          visible={showScannerModal}
          imageUri={rawImageUri}
          onClose={() => setShowScannerModal(false)}
          onAttach={handleScannerAttach}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.sm : spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    ...typography.subtextBold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 52,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  placeholderRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  pickerIcon: {
    marginRight: spacing.sm,
  },
  pickerPlaceholderText: {
    ...typography.body,
  },
  pickerValueText: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  selectedContactRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  selectedContactText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  contactName: {
    ...typography.bodyBold,
  },
  contactPhone: {
    ...typography.caption,
  },
  priorityContainer: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 4,
    marginVertical: spacing.xs,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityDefaultPill: {
    backgroundColor: 'transparent',
  },
  prioritySelectedPill: {
    borderWidth: 1,
    ...shadows.card,
  },
  priorityPillText: {
    ...typography.subtextBold,
  },
  priorityDefaultText: {},
  prioritySelectedText: {
    fontWeight: '700',
  },
  addPhotoDashedBox: {
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
    flexDirection: 'row',
  },
  addPhotoIcon: {
    marginRight: spacing.sm,
  },
  addPhotoText: {
    ...typography.subtextBold,
  },
  photoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    ...shadows.card,
  },
  photoAttachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attachedThumbnail: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    marginRight: spacing.md,
  },
  photoAttachedInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  photoTitleText: {
    ...typography.bodyBold,
  },
  photoSubtext: {
    ...typography.caption,
    fontWeight: '600',
  },
  chipGroupRow: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  remindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
  },
  remindChipCheck: {
    marginRight: 4,
  },
  remindChipDefault: {
    borderWidth: 1,
  },
  remindChipSelected: {
    borderWidth: 1,
  },
  remindChipText: {
    ...typography.subtextBold,
  },
  remindChipTextDefault: {},
  remindChipTextSelected: {
    fontWeight: '700',
  },
  disabledRepeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.lg,
    opacity: 0.6,
  },
  repeatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repeatIcon: {
    marginRight: spacing.xs,
  },
  repeatText: {
    ...typography.body,
  },
  repeatRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comingSoonText: {
    ...typography.subtext,
    marginRight: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
  },
  createButton: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  datePickerCard: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
  },
  dateSectionLabel: {
    ...typography.subtextBold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  datePill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  datePillDefault: {},
  datePillSelected: {},
  datePillText: {
    ...typography.subtextBold,
  },
  datePillTextDefault: {},
  datePillTextSelected: {
    fontWeight: '700',
  },
});
