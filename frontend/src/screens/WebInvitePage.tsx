import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { colors, typography, spacing, radius, shadows } from '../theme/tokens';
import { PriorityTag } from '../components/common/PriorityTag';

export const WebInvitePage: React.FC = () => {
  const { webInviteState, toggleWebInviteState, navigateTo } = useAppStore();
  const [isMobileView, setIsMobileView] = useState(true);

  return (
    <SafeAreaView style={styles.outerContainer}>
      {/* Dev Switcher Bar (development builds only) */}
      {__DEV__ && (
        <View style={styles.devBar}>
          <TouchableOpacity
            onPress={toggleWebInviteState}
            style={styles.devBadge}
            accessibilityRole="button"
            accessibilityLabel="Toggle invite state"
          >
            <Text style={styles.devText}>
              State: {webInviteState === 'task-waiting' ? 'Task Waiting' : 'Link Expired'} (Tap to toggle)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsMobileView(!isMobileView)}
            style={[styles.devBadge, { marginLeft: spacing.sm }]}
            accessibilityRole="button"
            accessibilityLabel="Toggle mobile or desktop view"
          >
            <Text style={styles.devText}>
              View: {isMobileView ? 'Mobile' : 'Desktop'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollCenterContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mock Browser URL Bar */}
        <View style={[styles.browserBar, !isMobileView && styles.browserBarDesktop]}>
          <Text style={styles.urlText}>remindd.app/t/8fK2p</Text>
          <TouchableOpacity
            onPress={() => navigateTo('TaskList')}
            accessibilityRole="button"
            accessibilityLabel="Open App"
          >
            <Text style={styles.appLinkText}>Open App</Text>
          </TouchableOpacity>
        </View>

        {/* Main Responsive Web View Container */}
        <View
          style={[
            styles.webCardContainer,
            isMobileView ? styles.mobileCard : styles.desktopCard,
          ]}
        >
          {/* Remindd Web Header Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="notifications" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.logoTitle}>remindd</Text>
          </View>

          {webInviteState === 'task-waiting' ? (
            // TASK WAITING STATE (Images 15 & 17)
            <View style={styles.contentBody}>
              <Text style={styles.mainTitle}>
                Bilal wants to remind you about something
              </Text>

              <View style={styles.taskCardPreview}>
                <View style={styles.priorityRow}>
                  <PriorityTag priority="High" />
                </View>
                <Text style={styles.previewTitle}>
                  Pick up Ammi's blood pressure medicine from Servaid Pharmacy
                </Text>
                <Text style={styles.dueText}>Due today, 6:30 PM</Text>
                <View style={styles.lockRow}>
                  <Ionicons
                    name="lock-closed"
                    size={13}
                    color={colors.textMuted}
                    style={styles.lockIcon}
                  />
                  <Text style={styles.lockText}>
                    Open the app to see full details and reply
                  </Text>
                </View>
              </View>

              <Text style={styles.explainText}>
                remindd is how two people keep track of a reminder together, just a phone
                number, no account needed on either side.
              </Text>

              {/* App Store / Google Play Badges */}
              <View style={styles.storeBadgesRow}>
                <TouchableOpacity
                  style={styles.appStoreBadge}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Download on the App Store"
                >
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.badgeIcon} />
                  <View style={styles.badgeTextCol}>
                    <Text style={styles.badgeSub}>Available on the</Text>
                    <Text style={styles.badgeMain}>App Store</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.googlePlayBadge}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Get it on Google Play"
                >
                  <Ionicons
                    name="logo-google-playstore"
                    size={18}
                    color="#34A853"
                    style={styles.badgeIcon}
                  />
                  <View style={styles.badgeTextCol}>
                    <Text style={styles.badgeSub}>GET IT ON</Text>
                    <Text style={styles.badgeMain}>Google Play</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.alreadyHaveText}>
                Already have remindd? Opening this link there will show the task directly.
              </Text>
            </View>
          ) : (
            // LINK EXPIRED STATE (Image 16)
            <View style={styles.contentBody}>
              <View style={styles.expiredIconCircle}>
                <MaterialCommunityIcons name="calendar-remove" size={28} color={colors.textMuted} />
              </View>

              <Text style={styles.mainTitle}>
                This reminder isn't available anymore
              </Text>

              <Text style={styles.expiredSubtext}>
                It may have been cancelled, or the link has expired. Get remindd to see
                reminders shared with you directly.
              </Text>

              {/* App Store / Google Play Badges */}
              <View style={styles.storeBadgesRow}>
                <TouchableOpacity
                  style={styles.appStoreBadge}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Download on the App Store"
                >
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.badgeIcon} />
                  <View style={styles.badgeTextCol}>
                    <Text style={styles.badgeSub}>Available on the</Text>
                    <Text style={styles.badgeMain}>App Store</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.googlePlayBadge}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Get it on Google Play"
                >
                  <Ionicons
                    name="logo-google-playstore"
                    size={18}
                    color="#34A853"
                    style={styles.badgeIcon}
                  />
                  <View style={styles.badgeTextCol}>
                    <Text style={styles.badgeSub}>GET IT ON</Text>
                    <Text style={styles.badgeMain}>Google Play</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.bgScreen,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  devBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  devBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  devText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollCenterContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  browserBar: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  browserBarDesktop: {
    maxWidth: 720,
  },
  urlText: {
    ...typography.subtext,
    color: colors.textSecondary,
  },
  appLinkText: {
    ...typography.subtextBold,
    color: colors.primary,
  },
  webCardContainer: {
    backgroundColor: colors.bgScreen,
    borderRadius: 24,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
  },
  mobileCard: {
    maxWidth: 400,
  },
  desktopCard: {
    maxWidth: 720,
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    ...shadows.modal,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  logoTitle: {
    ...typography.h2,
    fontSize: 22,
    color: colors.textPrimary,
  },
  contentBody: {
    width: '100%',
    alignItems: 'center',
  },
  mainTitle: {
    ...typography.h1,
    fontSize: 26,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 34,
    maxWidth: 440,
  },
  taskCardPreview: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...shadows.card,
  },
  priorityRow: {
    marginBottom: spacing.sm,
  },
  previewTitle: {
    ...typography.h2,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    lineHeight: 24,
  },
  dueText: {
    ...typography.subtext,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 6,
  },
  lockText: {
    ...typography.subtext,
    color: colors.textMuted,
  },
  explainText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
    maxWidth: 420,
  },
  storeBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  appStoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginRight: spacing.sm,
  },
  googlePlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeTextCol: {
    justifyContent: 'center',
  },
  badgeSub: {
    fontSize: 9,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  badgeMain: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alreadyHaveText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    maxWidth: 360,
  },

  // Expired State styles
  expiredIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  expiredSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
    maxWidth: 400,
  },
});
