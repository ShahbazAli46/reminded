import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { typography, spacing, radius, shadows } from '../../theme/tokens';
import { Button } from './Button';

interface DateTimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (formattedSchedule: string, exactDate: Date) => void;
  initialDate?: Date;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const TIME_PRESETS = [
  { label: 'Morning', time: '9:00 AM', hour: 9, minute: 0, ampm: 'AM' as const },
  { label: 'Afternoon', time: '2:00 PM', hour: 2, minute: 0, ampm: 'PM' as const },
  { label: 'Evening', time: '6:00 PM', hour: 6, minute: 0, ampm: 'PM' as const },
  { label: 'Night', time: '9:00 PM', hour: 9, minute: 0, ampm: 'PM' as const },
];

export const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({
  visible,
  onClose,
  onApply,
  initialDate,
}) => {
  const { colors, isDark } = useTheme();

  // Date selection state
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || now);
  const [dateMode, setDateMode] = useState<'today' | 'tomorrow' | 'calendar'>('today');

  // Calendar navigation month/year
  const [displayMonthDate, setDisplayMonthDate] = useState<Date>(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  // Time selection state
  const [hour, setHour] = useState<number>(5);
  const [minute, setMinute] = useState<number>(0);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('PM');

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const handleSelectToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setDateMode('today');
    setDisplayMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleSelectTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
    setDateMode('tomorrow');
    setDisplayMonthDate(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1));
  };

  const handleSelectCalendarDay = (dayNumber: number) => {
    const newDate = new Date(
      displayMonthDate.getFullYear(),
      displayMonthDate.getMonth(),
      dayNumber
    );
    setSelectedDate(newDate);
    setDateMode('calendar');
  };

  const handlePrevMonth = () => {
    setDisplayMonthDate(
      new Date(displayMonthDate.getFullYear(), displayMonthDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setDisplayMonthDate(
      new Date(displayMonthDate.getFullYear(), displayMonthDate.getMonth() + 1, 1)
    );
  };

  // Adjust time functions
  const changeHour = (delta: number) => {
    let next = hour + delta;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    setHour(next);
  };

  const changeMinute = (delta: number) => {
    let next = minute + delta;
    if (next >= 60) next = 0;
    if (next < 0) next = 55;
    setMinute(next);
  };

  const addQuickMinutes = (mins: number) => {
    let newMin = minute + mins;
    let addHours = Math.floor(newMin / 60);
    newMin = newMin % 60;
    setMinute(newMin);
    if (addHours > 0) {
      let newHour = ((hour - 1 + addHours) % 12) + 1;
      setHour(newHour);
    }
  };

  const applyPreset = (preset: typeof TIME_PRESETS[0]) => {
    setHour(preset.hour);
    setMinute(preset.minute);
    setAmpm(preset.ampm);
  };

  // Format final label
  const minuteFormatted = minute.toString().padStart(2, '0');
  const timeFormatted = `${hour}:${minuteFormatted} ${ampm}`;

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  let dateFormatted = '';
  if (isSameDay(selectedDate, today)) {
    dateFormatted = 'Today';
  } else if (isSameDay(selectedDate, tomorrow)) {
    dateFormatted = 'Tomorrow';
  } else {
    dateFormatted = `${MONTH_NAMES[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getDate()}`;
  }

  const fullScheduleText = `${dateFormatted} · ${timeFormatted}`;

  const handleApply = () => {
    const finalDate = new Date(selectedDate);
    let h24 = hour % 12;
    if (ampm === 'PM') h24 += 12;
    finalDate.setHours(h24, minute, 0, 0);

    onApply(fullScheduleText, finalDate);
    onClose();
  };

  // Build calendar matrix
  const year = displayMonthDate.getFullYear();
  const month = displayMonthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Select Date & Time
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.primary }]}>
                {fullScheduleText}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.closeIconButton, { backgroundColor: colors.bgSubtle }]}
              accessibilityRole="button"
              accessibilityLabel="Close date and time picker"
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 1. Date Section */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DATE</Text>
            <View style={styles.quickChipsRow}>
              {/* Today Chip */}
              <TouchableOpacity
                onPress={handleSelectToday}
                style={[
                  styles.quickChip,
                  dateMode === 'today'
                    ? [styles.quickChipSelected, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]
                    : [styles.quickChipDefault, { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault }],
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="today-outline"
                  size={16}
                  color={dateMode === 'today' ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.quickChipText,
                    dateMode === 'today'
                      ? [styles.quickChipTextSelected, { color: colors.primary }]
                      : [styles.quickChipTextDefault, { color: colors.textSecondary }],
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>

              {/* Tomorrow Chip */}
              <TouchableOpacity
                onPress={handleSelectTomorrow}
                style={[
                  styles.quickChip,
                  dateMode === 'tomorrow'
                    ? [styles.quickChipSelected, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]
                    : [styles.quickChipDefault, { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault }],
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="partly-sunny-outline"
                  size={16}
                  color={dateMode === 'tomorrow' ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.quickChipText,
                    dateMode === 'tomorrow'
                      ? [styles.quickChipTextSelected, { color: colors.primary }]
                      : [styles.quickChipTextDefault, { color: colors.textSecondary }],
                  ]}
                >
                  Tomorrow
                </Text>
              </TouchableOpacity>

              {/* Pick a Date Chip */}
              <TouchableOpacity
                onPress={() => setDateMode('calendar')}
                style={[
                  styles.quickChip,
                  dateMode === 'calendar'
                    ? [styles.quickChipSelected, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]
                    : [styles.quickChipDefault, { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault }],
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar"
                  size={16}
                  color={dateMode === 'calendar' ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.quickChipText,
                    dateMode === 'calendar'
                      ? [styles.quickChipTextSelected, { color: colors.primary }]
                      : [styles.quickChipTextDefault, { color: colors.textSecondary }],
                  ]}
                >
                  Pick Date
                </Text>
              </TouchableOpacity>
            </View>

            {/* Interactive Month Calendar (Expanded when Pick Date is active) */}
            {dateMode === 'calendar' && (
              <View
                style={[
                  styles.calendarBox,
                  { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
                ]}
              >
                {/* Month Nav Header */}
                <View style={styles.calendarNavRow}>
                  <TouchableOpacity
                    onPress={handlePrevMonth}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.monthNavButton}
                  >
                    <Ionicons name="chevron-back" size={20} color={colors.primary} />
                  </TouchableOpacity>

                  <Text style={[styles.monthYearTitle, { color: colors.textPrimary }]}>
                    {MONTH_NAMES[month]} {year}
                  </Text>

                  <TouchableOpacity
                    onPress={handleNextMonth}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.monthNavButton}
                  >
                    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Weekday Names */}
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map((wd, i) => (
                    <Text key={i} style={[styles.weekdayText, { color: colors.textMuted }]}>
                      {wd}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {calendarCells.map((cellDay, index) => {
                    if (cellDay === null) {
                      return <View key={`empty_${index}`} style={styles.dayCell} />;
                    }

                    const cellDate = new Date(year, month, cellDay);
                    const isSelected = isSameDay(cellDate, selectedDate);
                    const isCurrentToday = isSameDay(cellDate, now);

                    return (
                      <TouchableOpacity
                        key={`day_${cellDay}`}
                        onPress={() => handleSelectCalendarDay(cellDay)}
                        style={[
                          styles.dayCell,
                          isSelected && [styles.dayCellSelected, { backgroundColor: colors.primary }],
                          !isSelected && isCurrentToday && [styles.dayCellToday, { borderColor: colors.primary }],
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumberText,
                            isSelected
                              ? [styles.dayNumberSelected, { color: '#FFFFFF' }]
                              : isCurrentToday
                              ? [styles.dayNumberToday, { color: colors.primary }]
                              : { color: colors.textPrimary },
                          ]}
                        >
                          {cellDay}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 2. Time Section */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>
              TIME PRESETS
            </Text>
            <View style={styles.presetsGrid}>
              {TIME_PRESETS.map((p) => {
                const isPresetActive = hour === p.hour && minute === p.minute && ampm === p.ampm;
                return (
                  <TouchableOpacity
                    key={p.label}
                    onPress={() => applyPreset(p)}
                    style={[
                      styles.presetCard,
                      isPresetActive
                        ? [styles.presetCardSelected, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]
                        : [styles.presetCardDefault, { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetLabelText,
                        isPresetActive ? { color: colors.primary } : { color: colors.textSecondary },
                      ]}
                    >
                      {p.label}
                    </Text>
                    <Text
                      style={[
                        styles.presetTimeText,
                        isPresetActive ? { color: colors.primary } : { color: colors.textPrimary },
                      ]}
                    >
                      {p.time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Interactive Custom Time Clock */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: spacing.lg }]}>
              CUSTOM TIME
            </Text>
            <View
              style={[
                styles.timePickerCard,
                { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
              ]}
            >
              <View style={styles.clockRow}>
                {/* Hour Stepper Column */}
                <View style={styles.timeDigitColumn}>
                  <TouchableOpacity
                    onPress={() => changeHour(1)}
                    hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    style={[styles.stepperArrow, { backgroundColor: colors.bgSubtle }]}
                  >
                    <Ionicons name="chevron-up" size={18} color={colors.primary} />
                  </TouchableOpacity>

                  <View style={[styles.digitBox, { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault }]}>
                    <Text style={[styles.digitText, { color: colors.textPrimary }]}>
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => changeHour(-1)}
                    hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    style={[styles.stepperArrow, { backgroundColor: colors.bgSubtle }]}
                  >
                    <Ionicons name="chevron-down" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Colon */}
                <Text style={[styles.colonText, { color: colors.textPrimary }]}>:</Text>

                {/* Minute Stepper Column */}
                <View style={styles.timeDigitColumn}>
                  <TouchableOpacity
                    onPress={() => changeMinute(5)}
                    hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    style={[styles.stepperArrow, { backgroundColor: colors.bgSubtle }]}
                  >
                    <Ionicons name="chevron-up" size={18} color={colors.primary} />
                  </TouchableOpacity>

                  <View style={[styles.digitBox, { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault }]}>
                    <Text style={[styles.digitText, { color: colors.textPrimary }]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => changeMinute(-5)}
                    hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    style={[styles.stepperArrow, { backgroundColor: colors.bgSubtle }]}
                  >
                    <Ionicons name="chevron-down" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* AM / PM Segmented Toggle */}
                <View style={[styles.ampmContainer, { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault }]}>
                  <TouchableOpacity
                    onPress={() => setAmpm('AM')}
                    style={[
                      styles.ampmButton,
                      ampm === 'AM' && [styles.ampmActive, { backgroundColor: colors.primary }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.ampmText,
                        ampm === 'AM' ? { color: '#FFFFFF', fontWeight: '700' } : { color: colors.textSecondary },
                      ]}
                    >
                      AM
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAmpm('PM')}
                    style={[
                      styles.ampmButton,
                      ampm === 'PM' && [styles.ampmActive, { backgroundColor: colors.primary }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.ampmText,
                        ampm === 'PM' ? { color: '#FFFFFF', fontWeight: '700' } : { color: colors.textSecondary },
                      ]}
                    >
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Minute Increments */}
              <View style={styles.quickMinutesRow}>
                {[0, 15, 30, 45].map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMinute(m)}
                    style={[
                      styles.minutePill,
                      minute === m
                        ? [styles.minutePillSelected, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]
                        : [styles.minutePillDefault, { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.minutePillText,
                        minute === m ? { color: colors.primary, fontWeight: '700' } : { color: colors.textSecondary },
                      ]}
                    >
                      :{m.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => addQuickMinutes(15)}
                  style={[styles.minutePill, { backgroundColor: colors.bgSubtle, borderColor: colors.borderDefault }]}
                >
                  <Text style={[styles.minutePillText, { color: colors.primary }]}>+15m</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer CTA */}
          <View style={[styles.modalFooter, { borderTopColor: colors.borderDefault }]}>
            <Button
              title={`Set Schedule (${fullScheduleText})`}
              onPress={handleApply}
              style={styles.applyButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
    paddingTop: spacing.lg,
    ...shadows.modal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 18,
  },
  headerSubtitle: {
    ...typography.subtextBold,
    marginTop: 2,
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.subtextBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md - 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  quickChipDefault: {},
  quickChipSelected: {},
  quickChipText: {
    ...typography.subtextBold,
  },
  quickChipTextDefault: {},
  quickChipTextSelected: {
    fontWeight: '700',
  },
  calendarBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  calendarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearTitle: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xs,
  },
  weekdayText: {
    ...typography.caption,
    fontWeight: '600',
    width: 36,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: radius.pill,
  },
  dayCellSelected: {},
  dayCellToday: {
    borderWidth: 1,
  },
  dayNumberText: {
    ...typography.body,
    fontSize: 14,
  },
  dayNumberSelected: {
    fontWeight: '700',
  },
  dayNumberToday: {
    fontWeight: '700',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetCard: {
    width: '48%',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  presetCardDefault: {},
  presetCardSelected: {},
  presetLabelText: {
    ...typography.caption,
    fontWeight: '600',
  },
  presetTimeText: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  timePickerCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  timeDigitColumn: {
    alignItems: 'center',
  },
  stepperArrow: {
    width: 36,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  digitBox: {
    width: 64,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 28,
    fontWeight: '700',
  },
  colonText: {
    fontSize: 32,
    fontWeight: '700',
    marginHorizontal: spacing.md,
  },
  ampmContainer: {
    marginLeft: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
  },
  ampmButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  ampmActive: {},
  ampmText: {
    ...typography.subtextBold,
    fontSize: 13,
  },
  quickMinutesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  minutePill: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  minutePillDefault: {},
  minutePillSelected: {},
  minutePillText: {
    ...typography.caption,
  },
  modalFooter: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  applyButton: {
    width: '100%',
  },
});
