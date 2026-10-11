import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  ViewStyle,
} from 'react-native';
import { typography, radius, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

interface TextAreaProps extends RNTextInputProps {
  label?: string;
  subtext?: string;
  containerStyle?: ViewStyle;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  subtext,
  containerStyle,
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.bgInput,
            borderColor: isFocused ? colors.borderFocused : colors.borderDefault,
            borderWidth: isFocused ? 1.5 : 1,
            color: colors.textPrimary,
          },
          style,
        ]}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        placeholderTextColor={colors.textMuted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {subtext && <Text style={[styles.subtext, { color: colors.textMuted }]}>{subtext}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    width: '100%',
  },
  label: {
    ...typography.subtextBold,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 88,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  subtext: {
    ...typography.subtext,
    marginTop: spacing.xs,
  },
});
