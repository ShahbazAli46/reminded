import React, { useState, useRef } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput as RNTextInput,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { typography, spacing, radius } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Avatar } from '../components/common/Avatar';
import { Contact } from '../services/mockData';
import { api } from '../services/apiClient';

interface ContactPickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ContactPickerSheet: React.FC<ContactPickerSheetProps> = ({
  visible,
  onClose,
}) => {
  const { contacts, selectedContact, setSelectedContact, updateContactsRegistration } = useAppStore();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleSyncContacts = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusMsg(null);

    // Continuous spin animation
    spinAnim.setValue(0);
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    try {
      // Check contacts against backend server in a single fast indexed query
      const phoneList = contacts.map((c) => c.phone);
      const res = await api.checkNumbers(phoneList);
      if (res?.success && res?.data) {
        updateContactsRegistration(res.data);
      }

      spinLoop.stop();
      spinAnim.setValue(0);
      setIsSyncing(false);
      const registeredCount = res?.data ? Object.keys(res.data).length : contacts.filter((c) => c.isRegistered).length;
      setSyncStatusMsg(`Contacts up to date · ${registeredCount} on Reminded`);

      setTimeout(() => {
        setSyncStatusMsg(null);
      }, 2500);
    } catch {
      spinLoop.stop();
      spinAnim.setValue(0);
      setIsSyncing(false);
      setSyncStatusMsg('Contacts refreshed');

      setTimeout(() => {
        setSyncStatusMsg(null);
      }, 2500);
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  // Split into Registered vs Unregistered (Option 1: Section Split)
  const registeredContacts = filteredContacts.filter((c) => c.isRegistered);
  const unregisteredContacts = filteredContacts.filter((c) => !c.isRegistered);

  const handleSelect = (contact: Contact) => {
    setSelectedContact(contact);
    onClose();
  };

  const renderContactItem = (contact: Contact) => {
    const isSelected = selectedContact?.id === contact.id;

    return (
      <TouchableOpacity
        key={contact.id}
        style={[styles.contactRow, { borderBottomColor: colors.borderLight }]}
        onPress={() => handleSelect(contact)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${contact.name}, ${contact.phone}, ${
          contact.isRegistered ? 'Registered on Reminded' : 'Not registered'
        }`}
      >
        {/* Avatar with registered badge indicator */}
        <View style={styles.avatarWrapper}>
          <Avatar initials={contact.initials} size={42} />
          {contact.isRegistered && (
            <View
              style={[
                styles.registeredBadge,
                { backgroundColor: colors.primary, borderColor: colors.bgScreen },
              ]}
            >
              <Ionicons name="flash" size={8} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Contact Info */}
        <View style={styles.contactInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.contactName, { color: colors.textPrimary }]} numberOfLines={1}>
              {contact.name}
            </Text>
            {contact.isRegistered && (
              <View
                style={[
                  styles.onAppTag,
                  { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.onAppTagText, { color: colors.primary }]}>Reminded</Text>
              </View>
            )}
          </View>
          <Text style={[styles.contactPhone, { color: colors.textSecondary }]} numberOfLines={1}>
            {contact.phone}
          </Text>
        </View>

        {/* Right Status / Selection Icon */}
        {isSelected ? (
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        ) : contact.isRegistered ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        ) : (
          <View
            style={[
              styles.notOnAppBadge,
              { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault },
            ]}
          >
            <Text style={[styles.notOnAppText, { color: colors.textMuted }]}>Not on app</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgScreen }]}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top Navigation Header */}
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
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={26} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Choose who to remind
            </Text>

            {/* Sync Contacts Button */}
            <TouchableOpacity
              onPress={handleSyncContacts}
              disabled={isSyncing}
              style={styles.headerIconButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Sync and refresh contacts"
            >
              <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                <Ionicons
                  name="sync-outline"
                  size={22}
                  color={isSyncing ? colors.primary : colors.textPrimary}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchWrapper, { backgroundColor: colors.bgCard }]}>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.bgSearch, borderColor: colors.borderDefault },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
              <RNTextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search name or number"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="never"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Sync Status Pill / Feedback */}
            {syncStatusMsg && (
              <View
                style={[
                  styles.syncFeedbackRow,
                  { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
              >
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.syncFeedbackText, { color: colors.primary }]}>
                  {syncStatusMsg}
                </Text>
              </View>
            )}
          </View>

          {/* Contacts Full Screen Scroll (Split into Registered vs Other) */}
          <FlatList
            data={[{ key: 'contacts_section_list' }]}
            keyExtractor={(item) => item.key}
            style={styles.listStyle}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={() =>
              filteredContacts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="person-outline" size={36} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No contacts match "{searchQuery}"
                  </Text>
                </View>
              ) : (
                <View>
                  {/* Section 1: Contacts on Reminded */}
                  {registeredContacts.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionTitleWithIcon}>
                          <Ionicons
                            name="sparkles"
                            size={13}
                            color={colors.primary}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>
                            CONTACTS ON REMINDED ({registeredContacts.length})
                          </Text>
                        </View>
                        <Text style={[styles.sectionSubtext, { color: colors.textMuted }]}>
                          Instant delivery
                        </Text>
                      </View>
                      {registeredContacts.map(renderContactItem)}
                    </View>
                  )}

                  {/* Section 2: Other Contacts (Not on app yet) */}
                  {unregisteredContacts.length > 0 && (
                    <View style={[styles.sectionContainer, { marginTop: spacing.xl }]}>
                      <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionTitleWithIcon}>
                          <Ionicons
                            name="people-outline"
                            size={14}
                            color={colors.textSecondary}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
                            OTHER CONTACTS ({unregisteredContacts.length})
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.sectionHelperNote, { color: colors.textMuted }]}>
                        Reminders sent to these contacts will be queued and delivered when they join.
                      </Text>
                      {unregisteredContacts.map(renderContactItem)}
                    </View>
                  )}
                </View>
              )
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
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
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 18,
  },
  searchWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
  },
  syncFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'center',
  },
  syncFeedbackText: {
    ...typography.caption,
    fontWeight: '600',
  },
  listStyle: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sectionContainer: {
    marginTop: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    ...typography.subtextBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionSubtext: {
    ...typography.caption,
    fontSize: 11,
  },
  sectionHelperNote: {
    ...typography.caption,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
  },
  avatarWrapper: {
    position: 'relative',
  },
  registeredBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactName: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  onAppTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    borderWidth: 0.8,
    marginLeft: 8,
  },
  onAppTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  contactPhone: {
    ...typography.caption,
    marginTop: 2,
  },
  notOnAppBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  notOnAppText: {
    ...typography.caption,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 1.5,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
