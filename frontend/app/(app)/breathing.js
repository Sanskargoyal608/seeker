import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

const PHASES = [
  { name: 'Inhale', duration: 4, color: '#4FC3F7' },
  { name: 'Hold', duration: 7, color: '#81C784' },
  { name: 'Exhale', duration: 8, color: '#FFB74D' },
];

export default function BreathingScreen() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0].duration);
  const [cycleCount, setCycleCount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isRunning) return;

    const phase = PHASES[currentPhase];
    
    // Animate the circle
    if (phase.name === 'Inhale') {
      Animated.timing(scaleAnim, { toValue: 1.5, duration: phase.duration * 1000, useNativeDriver: true }).start();
    } else if (phase.name === 'Exhale') {
      Animated.timing(scaleAnim, { toValue: 1, duration: phase.duration * 1000, useNativeDriver: true }).start();
    }

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          const nextPhase = (currentPhase + 1) % PHASES.length;
          if (nextPhase === 0) setCycleCount(c => c + 1);
          setCurrentPhase(nextPhase);
          return PHASES[nextPhase].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, currentPhase]);

  const toggleExercise = () => {
    if (isRunning) {
      setIsRunning(false);
      setCurrentPhase(0);
      setSecondsLeft(PHASES[0].duration);
      setCycleCount(0);
      scaleAnim.setValue(1);
    } else {
      setIsRunning(true);
    }
  };

  const phase = PHASES[currentPhase];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Breathing Exercise</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>4-7-8 Technique</Text>
        <Text style={styles.description}>
          This calming breath pattern helps reduce anxiety and promote relaxation. Inhale through your nose, hold, then exhale slowly through your mouth.
        </Text>

        <View style={styles.circleContainer}>
          <Animated.View style={[styles.breathCircle, { backgroundColor: phase.color, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.phaseText}>{isRunning ? phase.name : 'Ready'}</Text>
            <Text style={styles.timerText}>{isRunning ? secondsLeft : '—'}</Text>
          </Animated.View>
        </View>

        <Text style={styles.cycleText}>Cycles completed: {cycleCount}</Text>

        <View style={styles.phaseIndicator}>
          {PHASES.map((p, idx) => (
            <View key={p.name} style={[styles.phaseChip, currentPhase === idx && isRunning && { backgroundColor: p.color }]}> 
              <Text style={[styles.phaseChipText, currentPhase === idx && isRunning && { color: '#fff' }]}>{p.name} ({p.duration}s)</Text>
            </View>
          ))}
        </View>

        <Pressable style={[styles.startBtn, isRunning && styles.stopBtn]} onPress={toggleExercise}>
          <Ionicons name={isRunning ? 'stop' : 'play'} size={24} color={COLORS.onPrimary} />
          <Text style={styles.startBtnText}>{isRunning ? 'Stop' : 'Start Exercise'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg || 16, paddingVertical: SPACING.md || 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceVariant || '#e0e0e0',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontFamily: FONTS.family.headline, fontSize: 20, fontWeight: '700', color: COLORS.onSurface },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  subtitle: { fontFamily: FONTS.family.headline, fontSize: 28, fontWeight: '700', color: COLORS.onSurface, marginBottom: 8 },
  description: { fontFamily: FONTS.family.body, fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  circleContainer: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  breathCircle: {
    width: 180, height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  phaseText: { fontFamily: FONTS.family.headline, fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 },
  timerText: { fontFamily: FONTS.family.headline, fontSize: 48, fontWeight: '800', color: '#fff' },
  cycleText: { fontFamily: FONTS.family.body, fontSize: 14, color: COLORS.onSurfaceVariant, marginBottom: 24 },
  phaseIndicator: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  phaseChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerHigh || '#e8e8e8',
  },
  phaseChipText: { fontFamily: FONTS.family.body, fontSize: 12, fontWeight: '600', color: COLORS.onSurfaceVariant },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 40,
  },
  stopBtn: { backgroundColor: COLORS.error || '#DC2626' },
  startBtnText: { fontFamily: FONTS.family.body, fontSize: 16, fontWeight: '700', color: COLORS.onPrimary },
});
