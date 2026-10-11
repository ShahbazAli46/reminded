import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/useTheme';
import { Avatar } from '../components/common/Avatar';
import { TextInput } from '../components/common/TextInput';
import { Button } from '../components/common/Button';
import { PhotoPickerModal } from '../components/common/PhotoPickerModal';
import { BottomTabBar } from '../components/navigation/BottomTabBar';
import { getInitials } from '../utils/initials';

export const ProfileScreen: React.FC = () => {
  const {
    currentUser,
    phoneNumber,
    profileName,
    profilePhoto,
    setProfilePhoto,
    saveProfile,
    publicKeyFingerprint,
    fetchIdentityFingerprint,
    notificationsEnabled,
    toggleNotifications,
    logout,
    openBlockModal,
  } = useAppStore();

  const { colors } = useTheme();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profileName);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    fetchIdentityFingerprint();
    setEditedName(profileName);
  }, [profileName]);

  const handleTakePhoto = async () => {
    setShowPhotoModal(false);
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
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleChooseLibrary = async () => {
    setShowPhotoModal(false);
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
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleRemovePhoto = () => {
    setShowPhotoModal(false);
    setProfilePhoto(null);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    setIsSaving(true);
    await saveProfile(editedName.trim());
    setIsSaving(false);
    setIsEditingName(false);
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out from this device? Your local session will be closed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const rawPhone = currentUser?.phoneNumber || phoneNumber || '';
  const displayPhone = rawPhone
    ? (rawPhone.startsWith('+92') && rawPhone.length === 13
        ? `${rawPhone.slice(0, 3)} ${rawPhone.slice(3, 6)} ${rawPhone.slice(6)}`
        : rawPhone)
    : 'No phone connected';
  const displayName = currentUser?.name || profileName || 'User';
  const initials = getInitials(displayName);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      {/* 1. Top Header: Identical to Home & Requests ("Reminded" on left, Avatar "SA" on right) */}
      <View style={[styles.headerContainer, { backgroundColor: colors.bgScreen }]}>
        <Text style={[styles.appTitle, { color: colors.primary }]}>Reminded</Text>

        <View style={styles.avatarWrapper}>
          <Avatar
            initials={initials}
            source={profilePhoto ? { uri: profilePhoto } : undefined}
            size={36}
          />
        </View>
      </View>

      {/* 2. Scrollable Profile & Settings Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <View style={styles.avatarContainer}>
            <Avatar
              initials={initials}
              source={profilePhoto ? { uri: profilePhoto } : undefined}
              size={88}
              showCameraBadge
              onPress={() => setShowPhotoModal(true)}
              accessibilityLabel="Change profile photo"
            />
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>{displayName}</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditedName(displayName);
                  setIsEditingName(true);
                }}
                style={[styles.editPencilButton, { backgroundColor: colors.primaryLight }]}
                accessibilityRole="button"
                accessibilityLabel="Edit profile name"
              >
                <Ionicons name="pencil" size={15} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.phoneBadge, { backgroundColor: colors.bgSubtle }]}>
              <Ionicons name="lock-closed" size={12} color={colors.status.DonePending.text} />
              <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{displayPhone}</Text>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
        </View>

        {/* Security & End-to-End Encryption Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.shieldIconWrapper, { backgroundColor: colors.status.DonePending.bg }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.status.DonePending.text} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>End-to-End Encryption</Text>
              <Text style={[styles.sectionSubtext, { color: colors.status.DonePending.text }]}>
                Zero-Knowledge Privacy
              </Text>
            </View>
          </View>

          <View style={[styles.e2eeDetails, { backgroundColor: colors.bgCardSubtle }]}>
            <View style={styles.keyRow}>
              <Text style={[styles.keyLabel, { color: colors.textSecondary }]}>Identity Key Fingerprint</Text>
              <View style={[styles.fingerprintBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="key" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.fingerprintText, { color: colors.primary }]}>{publicKeyFingerprint}</Text>
              </View>
            </View>

            <Text style={[styles.securityNote, { color: colors.textMuted }]}>
              🔒 All reminder titles, details, attachments, and messages are encrypted directly on your physical device. Nobody else can view your private data.
            </Text>
          </View>
        </View>

        {/* Preferences & Notifications */}
        <View style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <Text style={[styles.sectionGroupTitle, { color: colors.textSecondary }]}>Preferences</Text>

          {/* Push Notifications Row */}
          <View style={styles.settingRow}>
            <View style={[styles.settingIconWrapper, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="notifications" size={18} color={colors.primary} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Push Notifications</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Real-time alerts for incoming tasks & comments
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#E2E8F0', true: colors.primaryLight }}
              thumbColor={notificationsEnabled ? colors.primary : '#FFFFFF'}
            />
          </View>

          {/* Blocked Contacts */}
          <TouchableOpacity
            style={[styles.settingRow, styles.settingRowBorder, { borderTopColor: colors.borderLight }]}
            onPress={openBlockModal}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIconWrapper, { backgroundColor: colors.priority.High.bg }]}>
              <Ionicons name="hand-left" size={18} color={colors.priority.High.dot} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Blocked Contacts</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Manage blocked senders and spam prevention
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* App Info (Clean version, no VPS/hosting mentions) */}
        <View style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <Text style={[styles.sectionGroupTitle, { color: colors.textSecondary }]}>About</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App Version</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>1.0.0</Text>
          </View>
        </View>

        {/* Logout Action */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.otpError.bg, borderColor: colors.priority.High.border }]}
          onPress={handleLogoutPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.textError} style={styles.logoutIcon} />
          <Text style={[styles.logoutText, { color: colors.textError }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 3. Fixed Bottom Tab Bar */}
      <BottomTabBar />

      {/* Photo Picker Modal */}
      <PhotoPickerModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onTakePhoto={handleTakePhoto}
        onChooseLibrary={handleChooseLibrary}
        onRemovePhoto={handleRemovePhoto}
        hasCustomPhoto={Boolean(profilePhoto)}
      />

      {/* Edit Name Modal */}
      <Modal
        visible={isEditingName}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingName(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModalCard, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Profile Name</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              This is the display name your contacts see when you assign reminders.
            </Text>

            <TextInput
              label="Full Name"
              value={editedName}
              onChangeText={setEditedName}
              placeholder="e.g. Shahbaz Ali"
              autoFocus
            />

            <View style={styles.modalButtonRow}>
              <Button
                title="Cancel"
                variant="text"
                onPress={() => setIsEditingName(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={isSaving ? 'Saving...' : 'Save'}
                onPress={handleSaveName}
                style={{ flex: 1, marginLeft: 8 }}
                disabled={!editedName.trim() || isSaving}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  appTitle: {
    fontFamily: 'Roboto_500Medium',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  avatarWrapper: {
    padding: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },
  heroCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  userInfo: {
    alignItems: 'center',
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
  },
  editPencilButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 12,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  verifiedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    marginHorizontal: 6,
  },
  verifiedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shieldIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtext: {
    fontSize: 12,
    fontWeight: '600',
  },
  e2eeDetails: {
    borderRadius: 12,
    padding: 12,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  keyLabel: {
    fontSize: 12,
  },
  fingerprintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fingerprintText: {
    fontSize: 12,
    fontWeight: '700',
  },
  securityNote: {
    fontSize: 12,
    lineHeight: 17,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingRowBorder: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 12,
  },
  settingIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});
