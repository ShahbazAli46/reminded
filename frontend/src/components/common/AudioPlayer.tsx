import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../../theme/useTheme';
import { typography, spacing, radius } from '../../theme/tokens';
import { DEFAULT_API_URL } from '../../services/apiClient';

interface AudioPlayerProps {
  audioUrl: string;
  durationText?: string;
  color?: string; // Optional custom tint color for the waveform/icons
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, durationText, color }) => {
  const { colors } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const activeColor = color || colors.primary;

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const handlePlayPause = async () => {
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        if (!soundRef.current) {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
          });

          // Resolve full URL if relative
          const fullUrl = audioUrl.startsWith('http')
            ? audioUrl
            : `${DEFAULT_API_URL.replace('/api', '')}${audioUrl}`;

          const { sound } = await Audio.Sound.createAsync(
            { uri: fullUrl },
            { shouldPlay: true },
            onPlaybackStatusUpdate
          );
          soundRef.current = sound;
          setIsPlaying(true);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.warn('AudioPlayer play error:', err);
      setIsPlaying(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        soundRef.current?.setPositionAsync(0);
      }
    }
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSearch }]}>
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: activeColor }]}
        onPress={handlePlayPause}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause voice note' : 'Play voice note'}
      >
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={14} color="#FFFFFF" />
      </TouchableOpacity>
      
      <View style={styles.waveformContainer}>
        {/* Simple simulated waveform bar / progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.borderDefault }]}>
          <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: activeColor }]} />
        </View>
      </View>

      <Text style={[styles.durationText, { color: colors.textSecondary }]}>
        {durationText || 'Voice Note'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.lg,
    marginVertical: spacing.xs,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  waveformContainer: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  durationText: {
    ...typography.caption,
  },
});
