// frontend/components/OTPInput.js
// 6-box OTP input — auto-focuses next box, handles paste
import React, { useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const OTP_LENGTH = 6;

const OTPInput = ({ value = '', onChange, disabled = false }) => {
  const inputRefs = useRef([]);

  // Convert string value to array of digits
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || '');

  const handleChange = useCallback(
    (text, index) => {
      // Handle paste: if pasted text is longer than 1 char
      const cleaned = text.replace(/[^0-9]/g, '');

      if (cleaned.length > 1) {
        // Paste scenario — fill all boxes from this index
        const newDigits = [...digits];
        for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i++) {
          newDigits[index + i] = cleaned[i];
        }
        onChange(newDigits.join(''));
        // Focus last filled box
        const lastIndex = Math.min(index + cleaned.length - 1, OTP_LENGTH - 1);
        inputRefs.current[lastIndex]?.focus();
        return;
      }

      const newDigits = [...digits];
      newDigits[index] = cleaned.slice(-1); // Take last char only
      onChange(newDigits.join(''));

      // Auto-focus next input
      if (cleaned && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits, onChange]
  );

  const handleKeyPress = useCallback(
    ({ nativeEvent }, index) => {
      if (nativeEvent.key === 'Backspace') {
        if (!digits[index] && index > 0) {
          // Move to previous box if current is empty
          const newDigits = [...digits];
          newDigits[index - 1] = '';
          onChange(newDigits.join(''));
          inputRefs.current[index - 1]?.focus();
        } else {
          const newDigits = [...digits];
          newDigits[index] = '';
          onChange(newDigits.join(''));
        }
      }
    },
    [digits, onChange]
  );

  return (
    <View style={styles.container}>
      {digits.map((digit, index) => (
        <Pressable
          key={index}
          onPress={() => inputRefs.current[index]?.focus()}
        >
          <TextInput
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.box,
              digit && styles.boxFilled,
              disabled && styles.boxDisabled,
            ]}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH} // Allow paste on iOS
            textAlign="center"
            selectionColor={COLORS.primary}
            editable={!disabled}
            accessible
            accessibilityLabel={`OTP digit ${index + 1}`}
          />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    color: COLORS.text,
    fontSize: FONTS.sizes.h3,
    fontWeight: FONTS.weights.bold,
    textAlign: 'center',
  },
  boxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  boxDisabled: {
    opacity: 0.5,
  },
});

export default OTPInput;
