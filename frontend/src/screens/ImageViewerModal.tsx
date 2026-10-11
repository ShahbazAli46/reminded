import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { typography, spacing } from '../theme/tokens';

export const ImageViewerModal: React.FC = () => {
  const { showImageViewer, activeImageUri, closeImageViewer } = useAppStore();

  return (
    <Modal
      visible={showImageViewer}
      transparent={false}
      animationType="fade"
      onRequestClose={closeImageViewer}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeImageUri || 'Image'}
          </Text>
          <TouchableOpacity
            onPress={closeImageViewer}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          {/* TODO: no real image loading yet, swap for an actual <Image> once attachments are backed by real URLs */}
          <View style={styles.fullImagePlaceholder}>
            <Ionicons name="image-outline" size={64} color="#9CA3AF" style={styles.placeholderIcon} />
            <Text style={styles.placeholderText}>
              {activeImageUri || 'Image'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.xs : spacing.md,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    flex: 1,
    marginRight: spacing.md,
  },
  closeButton: {
    padding: spacing.xs,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImagePlaceholder: {
    width: '90%',
    height: '70%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  placeholderIcon: {
    marginBottom: spacing.md,
  },
  placeholderText: {
    ...typography.h2,
    color: '#FFFFFF',
  },
});
