import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { colors, typography, spacing, radius, shadows } from '../theme/tokens';
import { Avatar } from '../components/common/Avatar';
import { TextInput } from '../components/common/TextInput';
import { Button } from '../components/common/Button';
import { PhotoPickerModal } from '../components/common/PhotoPickerModal';
import { getInitials } from '../utils/initials';

export const ProfileSetupScreen: React.FC = () => {
  const { profileName, profilePhoto, setProfilePhoto, saveProfile, isLoadingAuth, navigateTo } =
    useAppStore();
  const [name, setName] = useState(profileName || 'Shahbaz Ali');
  const [photoUri, setPhotoUri] = useState<string | null>(profilePhoto || null);
  const [errorText, setErrorText] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const trimmedName = name.trim();
  const isNameValid = trimmedName.length >= 2;
  const currentInitials = getInitials(trimmedName);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleChooseLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permission is required to select a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
  };

  const handleContinue = async () => {
    if (!isNameValid) {
      setErrorText('Please enter your name (at least 2 characters).');
      return;
    }
    setErrorText('');
    setProfilePhoto(photoUri);
    await saveProfile(trimmedName);
    navigateTo('TaskList');
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.innerContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>
              This is what the people you remind will see.
            </Text>

            {/* Avatar with Camera badge & real photo picker */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainerShadow}>
                <Avatar
                  initials={isNameValid ? currentInitials : ''}
                  source={photoUri ? { uri: photoUri } : undefined}
                  size={104}
                  showCameraBadge
                  onPress={() => setShowPhotoModal(true)}
                  accessibilityLabel="Change profile photo"
                />
              </View>
              <TouchableOpacity
                onPress={() => setShowPhotoModal(true)}
                activeOpacity={0.7}
                style={styles.photoHintButton}
              >
                <Text style={styles.photoHintText}>
                  {photoUri ? 'Photo selected · Tap to change' : 'Tap camera to add photo (optional)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mandatory Name Field */}
            <TextInput
              label="Your name *"
              placeholder="e.g. Shahbaz Ali"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errorText) setErrorText('');
              }}
              error={errorText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={isNameValid ? handleContinue : undefined}
            />

            <Text style={styles.helperText}>
              {isNameValid
                ? `"${currentInitials}" will be shown as your avatar.`
                : 'Enter your name so recipients recognize your reminders.'}
            </Text>
          </View>

          {/* Footer with Mandatory Continue Button */}
          <View style={styles.footer}>
            <Button
              title={isLoadingAuth ? 'Saving profile...' : 'Continue'}
              onPress={handleContinue}
              disabled={!isNameValid || isLoadingAuth}
              style={styles.continueButton}
            />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* Custom Bottom Sheet Modal for Photo Selection */}
      <PhotoPickerModal
        visible={showPhotoModal}
        hasCustomPhoto={Boolean(photoUri)}
        onClose={() => setShowPhotoModal(false)}
        onTakePhoto={handleTakePhoto}
        onChooseLibrary={handleChooseLibrary}
        onRemovePhoto={handleRemovePhoto}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgScreen,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    fontSize: 28,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  avatarContainerShadow: {
    ...shadows.card,
    borderRadius: 52,
  },
  photoHintButton: {
    marginTop: spacing.sm,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  photoHintText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  helperText: {
    ...typography.subtext,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
  },
});
