import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { seedQuestions } from '../data/questions';
import { loadSession, DailySession } from '../utils/storage';

export default function QuizScreen() {
  const router = useRouter();
  const [session, setSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const s = await loadSession();
      if (!s) {
        router.replace('/');
        return;
      }
      setSession(s);
      setLoading(false);
    };
    fetchSession();
  }, [router]);

  if (loading || !session) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { currentIndex, questionIds } = session;
  const questionId = questionIds[currentIndex];
  const question = seedQuestions.find(q => q.id === questionId);

  if (!question) {
    return (
      <View style={styles.container}>
        <Text>Error: Question not found</Text>
        <Button title="Go Home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const handleChoice = (index: number) => {
    router.replace({
      pathname: '/answer-feedback',
      params: { selectedIndex: index.toString() },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>Question {currentIndex + 1} of {questionIds.length}</Text>
      
      <View style={styles.tagsContainer}>
        {question.tags?.map((tag, i) => (
          <Text key={i} style={styles.tag}>{tag}</Text>
        ))}
      </View>
      
      <Text style={styles.domain}>{question.domain} - {question.subdomain}</Text>
      <Text style={styles.title}>{question.prompt}</Text>
      
      <View style={styles.choicesContainer}>
        {question.choices.map((choice, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.choiceButton} 
            onPress={() => handleChoice(index)}
          >
            <Text style={styles.choiceText}>{choice}</Text>
          </TouchableOpacity>
        ))}
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
  progress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  domain: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    fontSize: 12,
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  choicesContainer: {
    width: '100%',
    gap: 12,
  },
  choiceButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  choiceText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#212529',
  },
});
