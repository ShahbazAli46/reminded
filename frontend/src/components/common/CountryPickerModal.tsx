import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TextInput as RNTextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COUNTRIES, Country } from '../../utils/countries';
import { colors, typography, radius, spacing } from '../../theme/tokens';

interface CountryPickerModalProps {
  visible: boolean;
  selectedCountry: Country;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export const CountryPickerModal: React.FC<CountryPickerModalProps> = ({
  visible,
  selectedCountry,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = COUNTRIES.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  const handleSelect = (country: Country) => {
    onSelect(country);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <SafeAreaView style={styles.sheetContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Country</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchWrapper}>
                <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
                <RNTextInput
                  style={styles.searchInput}
                  placeholder="Search country or code..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* List */}
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const isSelected = item.code === selectedCountry.code;
                  return (
                    <TouchableOpacity
                      style={[styles.countryRow, isSelected && styles.selectedRow]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.flagEmoji}>{item.flag}</Text>
                      <Text style={styles.countryName}>{item.name}</Text>
                      <Text style={styles.dialCode}>{item.dialCode}</Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={colors.primary}
                          style={styles.checkIcon}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </SafeAreaView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.bgScreen,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    marginHorizontal: spacing.xxl,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderDefault,
  },
  selectedRow: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  flagEmoji: {
    fontSize: 22,
    marginRight: spacing.md,
  },
  countryName: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  dialCode: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  checkIcon: {
    marginLeft: spacing.sm,
  },
});
