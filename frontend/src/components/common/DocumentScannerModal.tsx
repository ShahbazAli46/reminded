import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../../theme/useTheme';
import { typography, spacing, radius, shadows } from '../../theme/tokens';
import { Button } from './Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ScannedPhotoResult {
  uri: string;
  mode: 'original' | 'scanned';
  fileName: string;
}

interface DocumentScannerModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onAttach: (result: ScannedPhotoResult) => void;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  visible,
  imageUri,
  onClose,
  onAttach,
}) => {
  const { colors, isDark } = useTheme();
  const [filterMode, setFilterMode] = useState<'original' | 'scanned'>('scanned');
  const [currentUri, setCurrentUri] = useState<string | null>(imageUri);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync imageUri when opened
  React.useEffect(() => {
    if (imageUri) {
      setCurrentUri(imageUri);
      setFilterMode('scanned');
    }
  }, [imageUri]);

  const handleRotate = async () => {
    if (!currentUri) return;
    setIsProcessing(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ rotate: 90 }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCurrentUri(result.uri);
    } catch (err) {
      console.warn('Rotation failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAttach = () => {
    if (!currentUri) return;
    onAttach({
      uri: currentUri,
      mode: filterMode,
      fileName: filterMode === 'scanned' ? 'scanned_document.jpg' : 'captured_photo.jpg',
    });
    onClose();
  };

  if (!visible || !imageUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgScreen }]}>
        {/* Top Header */}
        <View
          style={[
            styles.headerRow,
            { backgroundColor: colors.bgCard, borderBottomColor: colors.borderDefault },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerIconButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Cancel scan"
          >
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Document Scanner
          </Text>

          <TouchableOpacity
            onPress={handleRotate}
            disabled={isProcessing}
            style={styles.headerIconButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Rotate 90 degrees"
          >
            <Ionicons name="reload-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filter Toggle Segmented Bar */}
        <View style={[styles.filterBarWrapper, { backgroundColor: colors.bgCard }]}>
          <View style={[styles.filterSegment, { backgroundColor: colors.bgSubtle }]}>
            {/* Original Option */}
            <TouchableOpacity
              onPress={() => setFilterMode('original')}
              style={[
                styles.filterTab,
                filterMode === 'original' && [
                  styles.filterTabActive,
                  { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
                ],
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="image-outline"
                size={16}
                color={filterMode === 'original' ? colors.primary : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.filterTabText,
                  filterMode === 'original'
                    ? [styles.filterTabTextActive, { color: colors.primary }]
                    : [styles.filterTabTextDefault, { color: colors.textSecondary }],
                ]}
              >
                Original
              </Text>
            </TouchableOpacity>

            {/* Scanned / CamScanner Option */}
            <TouchableOpacity
              onPress={() => setFilterMode('scanned')}
              style={[
                styles.filterTab,
                filterMode === 'scanned' && [
                  styles.filterTabActive,
                  { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
                ],
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name="sparkles"
                size={16}
                color={filterMode === 'scanned' ? colors.primary : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.filterTabText,
                  filterMode === 'scanned'
                    ? [styles.filterTabTextActive, { color: colors.primary }]
                    : [styles.filterTabTextDefault, { color: colors.textSecondary }],
                ]}
              >
                Scanned (CamScanner)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Central Document Canvas / Viewport */}
        <View style={styles.canvasContainer}>
          <View
            style={[
              styles.documentFrame,
              filterMode === 'scanned'
                ? styles.documentFrameScanned
                : [styles.documentFrameOriginal, { borderColor: colors.borderDefault }],
            ]}
          >
            {/* CamScanner Corner Guide Brackets */}
            {filterMode === 'scanned' && (
              <>
                <View style={[styles.cornerBracket, styles.cornerTopLeft, { borderColor: colors.primary }]} />
                <View style={[styles.cornerBracket, styles.cornerTopRight, { borderColor: colors.primary }]} />
                <View style={[styles.cornerBracket, styles.cornerBottomLeft, { borderColor: colors.primary }]} />
                <View style={[styles.cornerBracket, styles.cornerBottomRight, { borderColor: colors.primary }]} />
              </>
            )}

            {isProcessing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Enhancing document...
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.imageWrapper,
                  filterMode === 'scanned' && styles.scannedImageWrapper,
                ]}
              >
                <Image
                  source={{ uri: currentUri || imageUri }}
                  style={[
                    styles.previewImage,
                    filterMode === 'scanned' && styles.scannedFilterEffect,
                  ]}
                  resizeMode="contain"
                />

                {/* CamScanner Magic Contrast Overlay */}
                {filterMode === 'scanned' && (
                  <View
                    pointerEvents="none"
                    style={[
                      StyleSheet.absoluteFillObject,
                      styles.scannedContrastScrim,
                    ]}
                  />
                )}
              </View>
            )}
          </View>

          {/* Mode Explainer Pill */}
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  filterMode === 'scanned' ? colors.primaryLight : colors.bgSubtle,
                borderColor: filterMode === 'scanned' ? colors.primary : colors.borderDefault,
              },
            ]}
          >
            <Ionicons
              name={filterMode === 'scanned' ? 'sparkles' : 'camera-outline'}
              size={15}
              color={filterMode === 'scanned' ? colors.primary : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: filterMode === 'scanned' ? colors.primary : colors.textSecondary },
              ]}
            >
              {filterMode === 'scanned'
                ? 'CamScanner Clear · Background whitened & text enhanced'
                : 'Original Photo · Natural color capture'}
            </Text>
          </View>
        </View>

        {/* Footer Actions */}
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.bgCard, borderTopColor: colors.borderDefault },
          ]}
        >
          <Button
            title={`Attach as ${filterMode === 'scanned' ? 'Scanned Document' : 'Original Photo'}`}
            onPress={handleConfirmAttach}
            style={styles.attachButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
  headerIconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 18,
  },
  filterBarWrapper: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
  },
  filterSegment: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 3,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  filterTabActive: {
    borderWidth: 1,
    ...shadows.card,
  },
  filterTabText: {
    ...typography.subtextBold,
    fontSize: 13,
  },
  filterTabTextDefault: {},
  filterTabTextActive: {
    fontWeight: '700',
  },
  canvasContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  documentFrame: {
    width: SCREEN_WIDTH - spacing.xl * 2,
    flex: 1,
    maxHeight: '85%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentFrameOriginal: {
    borderWidth: 1,
    backgroundColor: '#000000',
  },
  documentFrameScanned: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    ...shadows.modal,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scannedImageWrapper: {
    backgroundColor: '#FFFFFF',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  scannedFilterEffect: {
    // CamScanner sharp text & high contrast styling
    opacity: 0.96,
  },
  scannedContrastScrim: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  cornerBracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 3,
    zIndex: 10,
  },
  cornerTopLeft: {
    top: 8,
    left: 8,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 8,
    right: 8,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 8,
    left: 8,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 8,
    right: 8,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusPillText: {
    ...typography.caption,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  attachButton: {
    width: '100%',
  },
});
