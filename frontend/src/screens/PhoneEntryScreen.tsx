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
  StatusBar,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { colors, typography, spacing } from '../theme/tokens';
import { TextInput } from '../components/common/TextInput';
import { Button } from '../components/common/Button';
import { CountryPickerModal } from '../components/common/CountryPickerModal';
import { COUNTRIES, DEFAULT_COUNTRY, Country } from '../utils/countries';

export const PhoneEntryScreen: React.FC = () => {
  const { phoneNumber, setPhoneNumber, phoneError, setPhoneError, sendOtp, isLoadingAuth, navigateTo } =
    useAppStore();
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState(
    phoneNumber ? phoneNumber.replace(selectedCountry.dialCode, '') : ''
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const handleContinue = async () => {
    const cleanNumber = localNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.length < 6) {
      setPhoneError('Enter a valid mobile number.');
      return;
    }
    const fullPhoneNumber = `${selectedCountry.dialCode}${cleanNumber}`;
    setPhoneNumber(fullPhoneNumber);
    const success = await sendOtp(fullPhoneNumber);
    if (success) {
      navigateTo('OtpVerification');
    }
  };

  const isFormValid = localNumber.replace(/[^0-9]/g, '').length >= 5 && !isLoadingAuth;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.innerContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            <Text style={styles.title}>What's your number?</Text>
            <Text style={styles.subtitle}>
              We'll text a code to confirm it's you. No account or password needed.
            </Text>

            <TextInput
              label="Phone number"
              countryCode={selectedCountry.dialCode}
              flag={selectedCountry.flag}
              onCountryCodePress={() => setShowCountryPicker(true)}
              placeholder={selectedCountry.placeholder}
              keyboardType="phone-pad"
              value={localNumber}
              onChangeText={(text) => {
                setLocalNumber(text);
                if (phoneError) setPhoneError('');
              }}
              error={phoneError}
              autoFocus
            />
          </View>

          <View style={styles.footer}>
            <Button
              title={isLoadingAuth ? "Sending code..." : "Continue"}
              onPress={handleContinue}
              disabled={!isFormValid}
              style={styles.continueButton}
            />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <CountryPickerModal
        visible={showCountryPicker}
        selectedCountry={selectedCountry}
        onSelect={(country) => {
          setSelectedCountry(country);
          if (phoneError) setPhoneError('');
        }}
        onClose={() => setShowCountryPicker(false)}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
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
    lineHeight: 22,
  },
  footer: {
    width: '100%',
  },
  continueButton: {
    width: '100%',
  },
});
