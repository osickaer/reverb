import { ScreenContainer } from "@/components/screen-container";
import { useThemeColors } from "@/contexts/theme-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FontSize, FontWeight, Spacing } from "../constants/theme";
import { seedQuestions } from "../data/questions";
import {
  DailySession,
  completeSession,
  loadSession,
  saveSession,
  updateQuestionStats,
} from "../utils/storage";

export default function AnswerFeedbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useThemeColors();
  const selectedIndex = parseInt(params.selectedIndex as string);

  const [session, setSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedSession, setUpdatedSession] = useState<DailySession | null>(
    null,
  );

  useEffect(() => {
    const processAnswer = async () => {
      let currentSession = await loadSession();
      if (!currentSession) {
        router.replace("/");
        return;
      }

      setSession(currentSession);

      const { currentIndex, questionIds } = currentSession;
      const questionId = questionIds[currentIndex];
      const question = seedQuestions.find((q) => q.id === questionId);

      if (!question) {
        router.replace("/");
        return;
      }

      const isCorrect = selectedIndex === question.correctIndex;

      currentSession.status = "in-progress";
      if (isCorrect) {
        currentSession.score += 1;
      }

      await updateQuestionStats(question.id, isCorrect);

      setUpdatedSession(currentSession);
      setLoading(false);
    };

    processAnswer();
  }, []);

  if (loading || !session || !updatedSession) {
    return (
      <ScreenContainer
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const { currentIndex, questionIds } = session;
  const questionId = questionIds[currentIndex];
  const question = seedQuestions.find((q) => q.id === questionId)!;

  const isCorrect = selectedIndex === question.correctIndex;
  const isLastQuestion = currentIndex + 1 >= questionIds.length;

  const handleNext = async () => {
    const finalSession = { ...updatedSession };

    if (isLastQuestion) {
      await completeSession(finalSession);
      router.replace("/session-summary");
    } else {
      finalSession.currentIndex += 1;
      await saveSession(finalSession);
      router.replace("/quiz");
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <Text
        style={[
          styles.title,
          isCorrect ? { color: colors.correct } : { color: colors.incorrect },
        ]}
      >
        {isCorrect ? "Correct!" : "Incorrect"}
      </Text>

      {!isCorrect && (
        <Text
          style={[styles.correctAnswerInfo, { color: colors.textSecondary }]}
        >
          The correct answer was: {question.choices[question.correctIndex]}
        </Text>
      )}

      <Text style={[styles.explanation, { color: colors.textTertiary }]}>
        {question.explanation}
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          title={isLastQuestion ? "Finish Session" : "Next Question"}
          onPress={handleNext}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.screen,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.base,
  },
  correctAnswerInfo: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.base,
    textAlign: "center",
  },
  explanation: {
    fontSize: FontSize.md,
    textAlign: "center",
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  buttonContainer: {
    marginVertical: Spacing.sm,
    width: "100%",
    paddingHorizontal: Spacing.xxl,
  },
});
