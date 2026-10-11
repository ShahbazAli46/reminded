import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { colors, typography, radius, spacing, fontFamily } from '../../theme/tokens';
import { AudioPlayer } from '../common/AudioPlayer';
import { Avatar } from '../common/Avatar';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderInitials: string;
  isMe: boolean;
  type: 'text' | 'voice' | 'image' | 'system';
  content?: string;
  voiceDuration?: string;
  imageUrl?: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  onRetry?: () => void;
  onImagePress?: () => void;
}

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  if (message.type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  if (message.isMe) {
    const isFailed = message.status === 'failed';
    const isSending = message.status === 'sending';

    return (
      <View style={styles.sentWrapper}>
        <View
          style={[
            styles.sentBubble,
            isFailed ? styles.failedBubble : null,
            isSending ? styles.sendingBubble : null,
          ]}
        >
          {message.type === 'text' && (
            <Text style={styles.sentText}>{message.content}</Text>
          )}

          {message.type === 'voice' && (
            <View style={{ marginVertical: spacing.xs, width: 220 }}>
              <AudioPlayer 
                audioUrl={message.content || ''} 
                durationText={message.voiceDuration || 'Voice Note'} 
                color="#FFFFFF"
              />
            </View>
          )}

          {message.type === 'image' && (
            <TouchableOpacity
              onPress={message.onImagePress}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="View image"
            >
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.statusFooter}>
            {isFailed ? (
              <TouchableOpacity
                onPress={message.onRetry}
                style={styles.failedRow}
                accessibilityRole="button"
                accessibilityLabel="Retry sending message"
              >
                <Ionicons
                  name="alert-circle"
                  size={12}
                  color={colors.textError}
                  style={styles.failedIcon}
                />
                <Text style={styles.failedText}>Not sent · tap to retry</Text>
              </TouchableOpacity>
            ) : isSending ? (
              <View style={styles.timeCheckRow}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={colors.textMuted}
                  style={styles.sendingIcon}
                />
                <Text style={styles.statusText}>Sending...</Text>
              </View>
            ) : (
              <View style={styles.timeCheckRow}>
                <Text style={styles.statusText}>{message.timestamp}</Text>
                <Ionicons
                  name={
                    message.status === 'read' || message.status === 'delivered'
                      ? 'checkmark-done'
                      : 'checkmark'
                  }
                  size={12}
                  color={colors.primary}
                  style={styles.checkIcon}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Received message
  return (
    <View style={styles.receivedWrapper}>
      <Avatar initials={message.senderInitials} size={32} />
      <View style={styles.receivedContentWrapper}>
        <View style={styles.receivedBubble}>
          {message.type === 'text' && (
            <Text style={styles.receivedText}>{message.content}</Text>
          )}

          {message.type === 'voice' && (
            <View style={{ marginVertical: spacing.xs, width: 220 }}>
              <AudioPlayer 
                audioUrl={message.content || ''} 
                durationText={message.voiceDuration || 'Voice Note'} 
                color={colors.primary}
              />
            </View>
          )}

          {message.type === 'image' && (
            <TouchableOpacity
              onPress={message.onImagePress}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="View image"
            >
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.receivedTimestamp}>{message.timestamp}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  systemContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  systemText: {
    ...typography.subtext,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sentWrapper: {
    alignItems: 'flex-end',
    marginVertical: spacing.xs,
  },
  sentBubble: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '80%',
  },
  sendingBubble: {
    backgroundColor: colors.bgSubtle,
  },
  failedBubble: {
    backgroundColor: '#FEE2E2',
  },
  sentText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  receivedWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: spacing.xs,
  },
  receivedContentWrapper: {
    marginLeft: spacing.sm,
    maxWidth: '80%',
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.bgSubtle,
  },
  receivedText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  receivedTimestamp: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  statusFooter: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  timeCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  checkIcon: {
    marginLeft: 4,
  },
  sendingIcon: {
    marginRight: 4,
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  failedIcon: {
    marginRight: 4,
  },
  failedText: {
    ...typography.caption,
    color: colors.textError,
    fontFamily: fontFamily.semiBold,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 180,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  playIcon: {
    marginLeft: 2,
  },
  waveformBar: {
    flex: 1,
    height: 16,
    backgroundColor: colors.borderDefault,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  voiceDuration: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  imagePlaceholder: {
    width: 180,
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
