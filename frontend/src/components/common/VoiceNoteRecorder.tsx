import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../../theme/useTheme';
import { typography, spacing, radius, shadows } from '../../theme/tokens';

export interface AudioNoteData {
  uri: string;
  durationText: string;
  durationMs: number;
}

interface VoiceNoteRecorderProps {
  audioData: AudioNoteData | null;
  onSaveAudio: (data: AudioNoteData) => void;
  onRemoveAudio: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  audioData,
  onSaveAudio,
  onRemoveAudio,
}) => {
  const { colors, isDark } = useTheme();

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Cleanup sounds on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone Access', 'Please allow microphone access to record voice instructions.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Failed to start recording', err);
      Alert.alert('Recording Error', 'Could not access microphone.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    try {
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();

      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        const finalSeconds = Math.max(1, recordSeconds);
        const mins = Math.floor(finalSeconds / 60);
        const secs = finalSeconds % 60;
        const durationText = `${mins}:${secs.toString().padStart(2, '0')}`;

        onSaveAudio({
          uri,
          durationText,
          durationMs: status.durationMillis || finalSeconds * 1000,
        });
      }
    } catch (err) {
      console.warn('Failed to stop recording', err);
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const togglePlayback = async () => {
    if (!audioData) return;

    if (isPlaying && soundRef.current) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      return;
    }

    try {
      if (!soundRef.current) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: audioData.uri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              if (status.didJustFinish) {
                setIsPlaying(false);
                sound.setPositionAsync(0);
              }
            }
          }
        );
        soundRef.current = sound;
        setIsPlaying(true);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('Failed to play audio note', err);
      setIsPlaying(false);
    }
  };

  const handleDiscard = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setIsPlaying(false);
    onRemoveAudio();
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // State 1: Active Recording in Progress
  if (isRecording) {
    return (
      <View
        style={[
          styles.cardContainer,
          styles.recordingBorder,
          { backgroundColor: colors.bgCard, borderColor: colors.priority.High.dot },
        ]}
      >
        <View style={styles.recordingLeftRow}>
          <Animated.View
            style={[
              styles.pulseDot,
              {
                backgroundColor: colors.priority.High.dot,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Text style={[styles.timerText, { color: colors.priority.High.text }]}>
            Recording {formatSecs(recordSeconds)}
          </Text>
        </View>

        <View style={styles.recordActionRow}>
          {/* Cancel (Trash) */}
          <TouchableOpacity
            onPress={cancelRecording}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionIconButton}
            accessibilityLabel="Cancel recording"
          >
            <Ionicons name="close-circle" size={24} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Stop Button */}
          <TouchableOpacity
            onPress={stopRecording}
            style={[styles.stopButton, { backgroundColor: colors.priority.High.dot }]}
            activeOpacity={0.8}
            accessibilityLabel="Stop recording"
          >
            <Ionicons name="stop" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // State 2: Audio Note Recorded & Ready
  if (audioData) {
    return (
      <View
        style={[
          styles.cardContainer,
          { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
        ]}
      >
        <View style={styles.savedAudioRow}>
          {/* Play/Pause Button */}
          <TouchableOpacity
            onPress={togglePlayback}
            style={[styles.playButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio note'}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color="#FFFFFF"
              style={!isPlaying ? { marginLeft: 2 } : null}
            />
          </TouchableOpacity>

          {/* Waveform Bars */}
          <View style={styles.waveformContainer}>
            <View style={styles.barsRow}>
              {[14, 22, 10, 26, 18, 28, 12, 24, 16, 20, 26, 14, 22, 12].map((height, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveformBar,
                    {
                      height,
                      backgroundColor: isPlaying
                        ? colors.primary
                        : isDark
                        ? '#334155'
                        : '#CBD5E1',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.durationText, { color: colors.textSecondary }]}>
              Voice note · {audioData.durationText}
            </Text>
          </View>

          {/* Trash Button */}
          <TouchableOpacity
            onPress={handleDiscard}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Delete voice note"
          >
            <Ionicons name="trash-outline" size={22} color={colors.textError} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // State 3: Empty (Tap to Record)
  return (
    <TouchableOpacity
      onPress={startRecording}
      style={[
        styles.emptyDashedBox,
        { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
      ]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Record voice message"
    >
      <View style={[styles.micCircle, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="mic" size={20} color={colors.primary} />
      </View>
      <View style={styles.emptyTextContainer}>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Record voice note
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Add spoken details or instructions (up to 2 min)
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    justifyContent: 'center',
    ...shadows.card,
  },
  recordingBorder: {
    borderWidth: 1.5,
  },
  recordingLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  timerText: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  recordActionRow: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionIconButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  waveformContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  waveformBar: {
    width: 3.5,
    borderRadius: 2,
  },
  durationText: {
    ...typography.caption,
    fontWeight: '600',
  },
  emptyDashedBox: {
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  micCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  emptySubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
});
