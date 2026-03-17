import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { loadSession, DailySession } from '../utils/storage';

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
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { score, questionIds } = session;
  const total = questionIds.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Complete!</Text>
      <Text style={styles.scoreText}>
        You scored {score} out of {total}
      </Text>
      <Text style={styles.placeholderText}>
        Great job showing up today and stretching your knowledge.
      </Text>
      <Button title="Back to Home" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
});
