import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { loadSession, DailySession } from '../utils/storage';
import { Colors, FontSize, FontWeight, Spacing } from '../constants/theme';
import { ScreenContainer } from '@/components/screen-container';

export default function SessionSummaryScreen() {
  const router = useRouter();
  const [session, setSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const s = await loadSession();
      setSession(s);
      setLoading(false);
    };
    fetchSession();
  }, []);

  if (loading || !session) {
    return (
      <ScreenContainer style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </ScreenContainer>
    );
  }

  const { score, questionIds } = session;
  const total = questionIds.length;

  return (
    <ScreenContainer style={styles.container}>
      <Text style={styles.title}>Session Complete!</Text>
      <Text style={styles.scoreText}>
        You scored {score} out of {total}
      </Text>
      <Text style={styles.bodyText}>
        Great job showing up today and stretching your knowledge.
      </Text>
      <Button title="Back to Home" onPress={() => router.replace('/')} />
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
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.base,
    color: Colors.textPrimary,
  },
  scoreText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginBottom: Spacing.base,
  },
  bodyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    color: Colors.textTertiary,
  },
});
