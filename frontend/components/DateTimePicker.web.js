import React from 'react';
import { View, TextInput } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function DateTimePicker({ value, mode = 'date', onChange }) {
  const handleChange = (e) => {
    if (onChange) {
      // Mock the native event structure
      onChange({ type: 'set' }, new Date(e.target.value));
    }
  };

  const formattedValue = value ? value.toISOString().split('T')[mode === 'date' ? 0 : 1].substring(0, 5) : '';

  return (
    <View style={{
      backgroundColor: COLORS.surfaceContainer,
      borderRadius: RADIUS.DEFAULT,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    }}>
      <input 
        type={mode} 
        value={formattedValue} 
        onChange={handleChange}
        style={{
          border: 'none',
          backgroundColor: 'transparent',
          color: COLORS.textPrimary,
          fontFamily: 'Inter',
          fontSize: 16,
          outline: 'none',
          width: '100%'
        }}
      />
    </View>
  );
}
