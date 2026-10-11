import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/useTheme';
import { FilterChip } from '../components/common/FilterChip';
import { TaskRowCard, TaskItem } from '../components/tasks/TaskRowCard';
import { Avatar } from '../components/common/Avatar';
import { BottomTabBar } from '../components/navigation/BottomTabBar';
import { getInitials } from '../utils/initials';

export const TaskListScreen: React.FC = () => {
  const {
    segmentIndex,
    selectedFilter,
    setSelectedFilter,
    tasks,
    selectTask,
    navigateTo,
    profileName,
    profilePhoto,
    currentUser,
    notificationsEnabled,
    toggleNotifications,
  } = useAppStore();

  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filterOptions: Array<'All' | 'Upcoming' | 'Pending' | 'Completed'> = [
    'All',
    'Upcoming',
    'Pending',
    'Completed',
  ];

  const displayName = currentUser?.name || profileName || 'Shahbaz Ali';
  const initials = getInitials(displayName);

  // Filter tasks based on segment (Assigned vs Created), filter chip, and search query
  const filteredTasks = tasks.filter((task) => {
    // 1. Segment check
    const matchesSegment =
      segmentIndex === 0 ? !task.isCreatedByMe : task.isCreatedByMe;
    if (!matchesSegment) return false;

    // 2. Filter chip check
    if (selectedFilter === 'Upcoming' && task.status !== 'Upcoming') return false;
    if (
      selectedFilter === 'Pending' &&
      task.status !== 'Pending' &&
      task.status !== 'Done, pending confirmation'
    )
      return false;
    if (selectedFilter === 'Completed' && task.status !== 'Completed') return false;

    // 3. Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchNote = task.note?.toLowerCase().includes(q) ?? false;
      const matchPerson =
        task.assignerName.toLowerCase().includes(q) ||
        task.assigneeName.toLowerCase().includes(q);
      if (!matchTitle && !matchNote && !matchPerson) return false;
    }

    return true;
  });

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrapper, { backgroundColor: colors.bgSubtle }]}>
        <Ionicons name="checkbox-outline" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {searchQuery ? 'No matching reminders' : 'No reminders'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {searchQuery
          ? `We couldn't find anything for "${searchQuery}".`
          : segmentIndex === 0
          ? 'You have no assigned reminders in this view.'
          : 'Tap the + button below to send your first reminder.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      {/* 1. Header: "Reminded" in theme color with Profile Avatar "SA" */}
      <View style={[styles.headerContainer, { backgroundColor: colors.bgScreen }]}>
        <Text style={[styles.appTitle, { color: colors.primary }]}>Reminded</Text>

        {/* Profile Avatar "SA" (no dot, opens Profile) */}
        <TouchableOpacity
          onPress={() => navigateTo('Profile')}
          style={styles.avatarButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open profile and settings"
        >
          <Avatar
            initials={initials}
            source={profilePhoto ? { uri: profilePhoto } : undefined}
            size={36}
          />
        </TouchableOpacity>
      </View>

      {/* 2. Filter Pills (All, Upcoming, Pending, Completed) */}
      <View style={styles.filterPillsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipScroll}
        >
          {filterOptions.map((filter) => (
            <FilterChip
              key={filter}
              label={filter}
              selected={selectedFilter === filter}
              onPress={() => setSelectedFilter(filter)}
            />
          ))}
        </ScrollView>
      </View>

      {/* 3. Simple Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={[styles.searchBar, { backgroundColor: colors.bgSearch, borderColor: colors.borderDefault }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search reminders..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="never"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Gentle notification prompt in center below search (hidden when notifications are enabled) */}
      {!notificationsEnabled ? (
        <TouchableOpacity
          style={[
            styles.notificationNoticeContainer,
            { backgroundColor: colors.bgCardSubtle, borderColor: colors.borderDefault },
          ]}
          activeOpacity={0.75}
          onPress={toggleNotifications}
          accessibilityRole="button"
          accessibilityLabel="Enable notifications for better remindings"
        >
          <Ionicons name="notifications-off-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.notificationNoticeText, { color: colors.textSecondary }]}>
            Enable notifications for better remindings
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* 4. Task Cards List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }: { item: TaskItem }) => (
          <TaskRowCard task={item} onPress={() => selectTask(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* 5. Floating Action Button (FAB) comfortably above bottom tab bar */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
        onPress={() => navigateTo('CreateTask')}
        accessibilityLabel="Create reminder"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 6. Fixed Bottom Tab Bar */}
      <BottomTabBar />
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
  avatarButton: {
    padding: 2,
  },
  avatarWrapper: {
    position: 'relative',
  },
  blinkingDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  filterPillsSection: {
    paddingVertical: 4,
  },
  filterChipScroll: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Roboto_400Regular',
    paddingVertical: 0,
  },
  notificationNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  notificationNoticeText: {
    fontSize: 12,
    fontFamily: 'Roboto_400Regular',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 110,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 108 : 80,
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
});
