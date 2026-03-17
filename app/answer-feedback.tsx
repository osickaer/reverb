import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function AnswerFeedbackScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Answer Feedback</Text>
      <Text style={styles.placeholderText}>
        This is the Answer Feedback Screen. Here you'll see if your answer was correct and an explanation.
      </Text>
      <View style={styles.buttonContainer}>
        <Button title="Next Question" onPress={() => router.push('/quiz')} />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Finish Session" onPress={() => router.push('/session-summary')} />
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
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  buttonContainer: {
    marginVertical: 8,
    width: '100%',
    paddingHorizontal: 32,
  },
});
