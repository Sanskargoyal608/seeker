// frontend/components/EmergencyContactForm.js
// Dynamic form to add/remove emergency contacts (minimum 2 required)
import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

const EMPTY_CONTACT = { name: '', phone: '', relationship: '' };

const EmergencyContactForm = ({ contacts, onChange }) => {
  const addContact = () => {
    onChange([...contacts, { ...EMPTY_CONTACT }]);
  };

  const removeContact = (index) => {
    if (contacts.length <= 2) {
      Alert.alert(
        'Minimum Required',
        'You must provide at least 2 emergency contacts.'
      );
      return;
    }
    const updated = contacts.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateContact = (index, field, value) => {
    const updated = contacts.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    onChange(updated);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <Text style={styles.badge}>Minimum 2</Text>
      </View>

      {contacts.map((contact, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
            <Text style={styles.cardTitle}>Contact {index + 1}</Text>
            {contacts.length > 2 && (
              <Pressable
                onPress={() => removeContact(index)}
                style={styles.removeBtn}
                accessibilityLabel={`Remove contact ${index + 1}`}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={COLORS.textMuted}
            value={contact.name}
            onChangeText={(v) => updateContact(index, 'name', v)}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor={COLORS.textMuted}
            value={contact.phone}
            onChangeText={(v) => updateContact(index, 'phone', v)}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Relationship (e.g. Parent, Spouse)"
            placeholderTextColor={COLORS.textMuted}
            value={contact.relationship}
            onChangeText={(v) => updateContact(index, 'relationship', v)}
            autoCapitalize="words"
          />
        </View>
      ))}

      <Pressable
        onPress={addContact}
        style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        accessibilityLabel="Add another emergency contact"
      >
        <Text style={styles.addBtnText}>+ Add another contact</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.subtitle,
    fontWeight: FONTS.weights.semibold,
  },
  badge: {
    backgroundColor: COLORS.warningLight,
    color: COLORS.warning,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  indexText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    flex: 1,
  },
  removeBtn: {
    padding: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.errorLight,
  },
  removeBtnText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  input: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    color: COLORS.text,
    fontSize: FONTS.sizes.body,
    padding: SPACING.md,
  },
  addBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  addBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
  },
});

export default EmergencyContactForm;
