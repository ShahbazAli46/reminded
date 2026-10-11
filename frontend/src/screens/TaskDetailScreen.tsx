import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { typography, spacing, radius, shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityTag } from '../components/common/PriorityTag';
import { ChatBubble, ChatMessage } from '../components/chat/ChatBubble';
import { Button } from '../components/common/Button';
import { AudioPlayer } from '../components/common/AudioPlayer';
import { VoiceNoteRecorder, AudioNoteData } from '../components/common/VoiceNoteRecorder';
import { api } from '../services/apiClient';

interface TaskDetailScreenProps {
  onBack?: () => void;
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ onBack }) => {
  const {
    tasks,
    activeTaskId,
    chatMessages,
    sendChatMessage,
    retryChatMessage,
    updateTaskStatus,
    openImageViewer,
    navigateTo,
  } = useAppStore();

  const { colors } = useTheme();
  const [inputMessage, setInputMessage] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [audioNote, setAudioNote] = useState<AudioNoteData | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const currentTask = tasks.find((t) => t.id === activeTaskId) || tasks[0];
  const messages = chatMessages[currentTask.id] || [];

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleGoBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigateTo('TaskList');
    }
  };

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    sendChatMessage(currentTask.id, inputMessage.trim(), 'text');
    setInputMessage('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendVoiceNote = async (data: AudioNoteData) => {
    try {
      // 1. Upload the audio file to the backend
      const uploadRes = await api.uploadMedia(data.uri, 'audio/m4a');
      const fileUrl = uploadRes.data.url;

      // 2. Post as a voice comment
      // We pass the URL in encryptedContent (as it's standard for media URLs before full E2EE media is implemented)
      await api.postComment(currentTask.id, {
        messageType: 'voice',
        encryptedContent: fileUrl,
        contentIv: 'plain_media_iv_00',
        voiceDurationSeconds: data.durationMs / 1000,
      });

      // Cleanup
      setAudioNote(null);
      setIsRecordingVoiceNote(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.warn('Failed to upload/send voice note', err);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>{currentTask.title}</Text>

      <View style={styles.tagRow}>
        <StatusBadge status={currentTask.status} />
        <View style={{ width: spacing.xs }} />
        <PriorityTag priority={currentTask.priority} />
      </View>

      {/* Meta Card: Due Date, Assigner/Assignee, Notes & Main Audio Note */}
      <View
        style={[
          styles.cardBlock,
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.borderDefault,
          },
        ]}
      >
        <Text style={[styles.cardHeaderLabel, { color: colors.textSecondary }]}>Due Date</Text>
        <Text style={[styles.cardBodyText, { color: colors.textPrimary }]}>
          {currentTask.dueDateText || 'No due date'}
        </Text>

        <View style={{ height: spacing.md }} />

        <Text style={[styles.cardHeaderLabel, { color: colors.textSecondary }]}>Assigned By</Text>
        <Text style={[styles.cardBodyText, { color: colors.textPrimary }]}>
          {currentTask.isCreatedByMe ? 'You' : currentTask.assignerName}
        </Text>

        {currentTask.note && (
          <>
            <View style={{ height: spacing.md }} />
            <Text style={[styles.cardHeaderLabel, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[styles.cardBodyText, { color: colors.textPrimary }]}>{currentTask.note}</Text>
          </>
        )}

        {(currentTask as any).audioNoteUrl && (
          <>
            <View style={{ height: spacing.md }} />
            <Text style={[styles.cardHeaderLabel, { color: colors.textSecondary }]}>Voice Note</Text>
            <AudioPlayer
              audioUrl={(currentTask as any).audioNoteUrl}
              durationText={(currentTask as any).audioNoteDuration || 'Voice Note'}
            />
          </>
        )}

        <View style={[styles.actionBar, { borderTopColor: colors.borderDefault }]}>
          {currentTask.status === 'Upcoming' || currentTask.status === 'Pending' ? (
            <Button
              title="Mark done"
              onPress={() => updateTaskStatus(currentTask.id, 'Done, pending confirmation')}
              style={styles.actionButtonPrimary}
            />
          ) : currentTask.status === 'Done, pending confirmation' ? (
            <View style={styles.dualActionRow}>
              <Button
                title="Reopen"
                variant="secondary"
                onPress={() => updateTaskStatus(currentTask.id, 'Upcoming')}
                style={styles.halfButton}
              />
              <View style={{ width: spacing.md }} />
              <Button
                title="Confirm"
                onPress={() => updateTaskStatus(currentTask.id, 'Completed')}
                style={styles.halfButton}
              />
            </View>
          ) : (
            <Text style={[styles.statusNoticeText, { color: colors.textMuted }]}>
              This reminder is {currentTask.status.toLowerCase()}.
            </Text>
          )}
        </View>
      </View>

      {/* Attachment Card if present */}
      {currentTask.attachmentName && (
        <TouchableOpacity
          style={[
            styles.attachmentCard,
            {
              backgroundColor: colors.bgCard,
              borderColor: colors.borderDefault,
            },
          ]}
          onPress={() => openImageViewer('https://picsum.photos/800/600')}
          activeOpacity={0.8}
        >
          <View style={[styles.attachmentIconBox, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="image" size={24} color={colors.primary} />
          </View>
          <View style={styles.attachmentTextContainer}>
            <Text style={[styles.attachmentTitle, { color: colors.textPrimary }]}>
              {currentTask.attachmentName}
            </Text>
            <Text style={[styles.attachmentSubtext, { color: colors.textSecondary }]}>
              Tap to view full image
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <KeyboardAvoidingView
        style={styles.innerContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header Navigation */}
        <View style={[styles.topNav, { borderBottomColor: colors.borderDefault, backgroundColor: colors.bgCard }]}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </TouchableOpacity>

          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Reminder</Text>

          <TouchableOpacity
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Chat / Detail List */}
        <FlatList
          ref={flatListRef}
          style={styles.flatList}
          data={messages}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }: { item: ChatMessage }) => (
            <ChatBubble
              message={{
                ...item,
                onRetry: () => retryChatMessage(currentTask.id, item.id),
                onImagePress: () => openImageViewer(),
              }}
            />
          )}
          contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          overScrollMode="always"
        />

        {/* Chat Input & Action Bar Footer */}
        <View style={[styles.footerContainer, { backgroundColor: colors.bgCard, borderTopColor: colors.borderDefault }]}>
          <View
            style={[
              styles.chatInputRow,
              { backgroundColor: colors.bgSearch, borderColor: colors.borderDefault },
            ]}
          >
            <TouchableOpacity
              onPress={() => setIsRecordingVoiceNote((prev) => !prev)}
              style={styles.micButton}
              accessibilityRole="button"
              accessibilityLabel="Record voice note"
            >
              <Ionicons
                name={isRecordingVoiceNote ? "mic" : "mic-outline"}
                size={22}
                color={isRecordingVoiceNote ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>

            <TextInput
              style={[styles.chatInput, { color: colors.textPrimary, marginLeft: spacing.sm }]}
              placeholder="Reply to this reminder..."
              placeholderTextColor={colors.textMuted}
              value={inputMessage}
              onChangeText={setInputMessage}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendButton,
                { backgroundColor: inputMessage.trim() ? colors.primary : colors.bgSubtle },
              ]}
              disabled={!inputMessage.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={inputMessage.trim() ? '#FFFFFF' : colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Voice Recorder Overlay (Expanded below input row when active) */}
          {isRecordingVoiceNote && (
            <View style={styles.recorderOverlay}>
              <VoiceNoteRecorder
                audioData={audioNote}
                onSaveAudio={handleSendVoiceNote}
                onRemoveAudio={() => setAudioNote(null)}
              />
            </View>
          )}
        </View>
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
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.xs : spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  navTitle: {
    ...typography.h3,
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  headerBlock: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  taskTitle: {
    ...typography.h1,
    fontSize: 24,
    marginBottom: spacing.sm,
    lineHeight: 32,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardBlock: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.card,
  },
  cardHeaderLabel: {
    ...typography.subtextBold,
    marginBottom: spacing.xs,
  },
  cardBodyText: {
    ...typography.body,
    lineHeight: 22,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.card,
  },
  attachmentIconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  attachmentTextContainer: {
    flex: 1,
  },
  attachmentTitle: {
    ...typography.bodyBold,
  },
  attachmentSubtext: {
    ...typography.caption,
    marginTop: 2,
  },
  footerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  micButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recorderOverlay: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  chatInput: {
    flex: 1,
    height: 40,
    ...typography.body,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  actionButtonPrimary: {
    width: '100%',
  },
  dualActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    flex: 1,
  },
  statusNoticeText: {
    ...typography.subtext,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
});
