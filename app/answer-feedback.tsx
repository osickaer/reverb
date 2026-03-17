import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { seedQuestions } from '../data/questions';
import { loadSession, saveSession, updateMissedQuestions, DailySession, completeSession } from '../utils/storage';

export default function AnswerFeedbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const selectedIndex = parseInt(params.selectedIndex as string);
  
  const [session, setSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedSession, setUpdatedSession] = useState<DailySession | null>(null);

  useEffect(() => {
    const processAnswer = async () => {
      let currentSession = await loadSession();
      if (!currentSession) {
        router.replace('/');
        return;
      }
      
      setSession(currentSession);
      
      const { currentIndex, questionIds } = currentSession;
      const questionId = questionIds[currentIndex];
      const question = seedQuestions.find(q => q.id === questionId);
      
      if (!question) {
        router.replace('/');
        return;
      }
      
      const isCorrect = selectedIndex === question.correctIndex;
      
      // Update session state
      currentSession.status = 'in-progress';
      if (isCorrect) {
        currentSession.score += 1;
      }
      
      await updateMissedQuestions(question.id, !isCorrect);
      
      // We will increment currentIndex when they press "Next"
      
      setUpdatedSession(currentSession);
      setLoading(false);
    };
    
    processAnswer();
  }, []);

  if (loading || !session || !updatedSession) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { currentIndex, questionIds } = session;
  const questionId = questionIds[currentIndex];
  const question = seedQuestions.find(q => q.id === questionId)!;

  const isCorrect = selectedIndex === question.correctIndex;
  const isLastQuestion = currentIndex + 1 >= questionIds.length;

  const handleNext = async () => {
    const finalSession = { ...updatedSession };
    
    if (isLastQuestion) {
      await completeSession(finalSession);
      router.replace('/session-summary');
    } else {
      finalSession.currentIndex += 1;
      await saveSession(finalSession);
      router.replace('/quiz');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isCorrect ? styles.correctText : styles.wrongText]}>
        {isCorrect ? 'Correct!' : 'Incorrect'}
      </Text>
      
      {!isCorrect && (
        <Text style={styles.correctAnswerInfo}>
          The correct answer was: {question.choices[question.correctIndex]}
        </Text>
      )}
      
      <Text style={styles.explanation}>
        {question.explanation}
      </Text>

      <View style={styles.buttonContainer}>
        <Button 
          title={isLastQuestion ? "Finish Session" : "Next Question"} 
          onPress={handleNext} 
        />
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  correctText: {
    color: '#4CAF50',
  },
  wrongText: {
    color: '#F44336',
  },
  correctAnswerInfo: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  explanation: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 24,
  },
  buttonContainer: {
    marginVertical: 8,
    width: '100%',
    paddingHorizontal: 32,
  },
});
