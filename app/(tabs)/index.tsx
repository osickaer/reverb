import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { DailySession, initDailySessionIfNeeded, loadSession } from '../../utils/storage';

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
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleStart = () => {
    if (session?.status === 'completed') {
      return; // Can't start a completed session
    }
    router.push('/quiz');
  };

  return (
    <View style={styles.container}>
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 48,
  },
  card: {
    width: '100%',
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  cardDesc: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#495057',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
});
