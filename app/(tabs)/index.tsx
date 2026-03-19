import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { DailySession, initDailySessionIfNeeded, loadSession } from '../../utils/storage';
import { Colors, CommonStyles, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { ScreenContainer } from '@/components/screen-container';

export default function HomeScreen() {
  const router = useRouter();
  const [session, setSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      const fetchSession = async () => {
        setLoading(true);
        const newSession = await initDailySessionIfNeeded();
        setSession(newSession);
        setLoading(false);
      };
      
      fetchSession();
    }, [])
  );

  if (loading) {
    return (
      <ScreenContainer style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </ScreenContainer>
    );
  }

  const handleStart = () => {
    if (session?.status === 'completed') {
      return;
    }
    router.push('/quiz');
  };

  return (
    <ScreenContainer style={styles.container}>
      <Text style={styles.title}>Reverb</Text>
      <Text style={styles.subtitle}>Daily Knowledge Fitness</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's 5</Text>
        
        {session?.status === 'available' && (
          <>
            <Text style={styles.cardDesc}>Ready to stretch your knowledge? Start your daily session.</Text>
            <Button title="Start Session" onPress={handleStart} />
          </>
        )}
        
        {session?.status === 'in-progress' && (
          <>
            <Text style={styles.cardDesc}>You have an unfinished session.</Text>
            <Button title="Resume Session" onPress={handleStart} />
          </>
        )}
        
        {session?.status === 'completed' && (
          <>
            <Text style={styles.cardDesc}>You've completed your 5 daily questions!</Text>
            <Text style={styles.scoreText}>Score: {session?.score} / 5</Text>
            <Button title="Review Stats" onPress={() => {}} disabled />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.screen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.md + 2,
    color: Colors.textTertiary,
    marginBottom: Spacing.xxl + 16,
  },
  card: {
    ...CommonStyles.card,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    marginBottom: Spacing.base,
    color: Colors.textPrimary,
  },
  cardDesc: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    color: Colors.textSecondary,
  },
  scoreText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.base,
  },
});
