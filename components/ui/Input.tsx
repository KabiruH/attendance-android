// components/common/Input.tsx
import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  Text,
  ViewStyle
} from 'react-native';
import { LAYOUT } from '@/constants/Layout';
import { TYPOGRAPHY } from '@/constants/Typography';
import { COLORS } from '@/constants/Colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  required = false,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholderTextColor={COLORS.gray[400]}
        {...textInputProps}
      />
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.spacing.base,
  },
  
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  
  required: {
    color: COLORS.error,
  },
  
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: LAYOUT.borderRadius.base,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: TYPOGRAPHY.fontSize.base,
    backgroundColor: COLORS.white,
    color: COLORS.text.primary,
    minHeight: 48,
  },
  
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  
  inputError: {
    borderColor: COLORS.error,
  },
  
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.error,
    marginTop: 4,
  },
});
