import { ScreenContainer } from "@/components/screen-container";
import { useDomainTheme } from "@/constants/domain-themes";
import { useThemeColors } from "@/contexts/theme-context";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Brain,
  Check,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Button,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "../constants/theme";
import { fetchQuestions } from "../data/questions";
import { Question } from "../data/questions-interface";
import {
  buildShuffledQuestionIds,
  completeSession,
  DailySession,
  loadFreeplaySession,
  loadSession,
  saveFreeplaySession,
  saveSession,
  updateQuestionStats,
} from "../utils/storage";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase = "answering" | "feedback";

// Per-question result stored so the progress dots can reflect history
type QuestionResult = "correct" | "incorrect";

// ─── Progress timeline ────────────────────────────────────────────────────────

function ProgressTimeline({
  total,
  currentIndex,
  results,
  colors,
}: {
  total: number;
  currentIndex: number;
  results: (QuestionResult | null)[];
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={tlStyles.row}>
      {Array.from({ length: total }).map((_, i) => {
        const result = results[i];
        const isCurrent = i === currentIndex;
        const isPast = result !== null;

        return (
          <View key={i} style={tlStyles.item}>
            {i > 0 && (
              <View
                style={[
                  tlStyles.line,
                  { backgroundColor: colors.border },
                  isPast && {
                    backgroundColor:
                      result === "correct" ? colors.correct : colors.incorrect,
                  },
                ]}
              />
            )}

            {isPast ? (
              <View style={tlStyles.iconWrap}>
                {result === "correct" ? (
                  <Check size={14} color={colors.correct} strokeWidth={2.5} />
                ) : (
                  <X size={14} color={colors.incorrect} strokeWidth={2.5} />
                )}
              </View>
            ) : (
              <View style={tlStyles.numberWrap}>
                <Text
                  style={[
                    tlStyles.number,
                    isCurrent
                      ? [tlStyles.numberCurrent, { color: colors.textPrimary }]
                      : [tlStyles.numberFuture, { color: colors.textTertiary }],
                  ]}
                >
                  {i + 1}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const tlStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
  },
  line: {
    width: 20,
    height: 1.5,
    marginHorizontal: 2,
  },
  iconWrap: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  numberWrap: {
    alignItems: "center",
    width: 20,
  },
  number: {
    fontSize: FontSize.base,
    lineHeight: 20,
  },
  numberCurrent: {
    fontWeight: FontWeight.bold,
  },
  numberFuture: {
    fontWeight: FontWeight.regular,
  },
});

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const requestedMode = params.mode === "freeplay" ? "freeplay" : "daily";

  const [session, setSession] = useState<DailySession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("answering");
  const [selectedOriginalIndex, setSelectedOriginalIndex] = useState<
    number | null
  >(null);
  const [results, setResults] = useState<(QuestionResult | null)[]>([]);

  // Next button transition force delay state
  const [isNextReady, setIsNextReady] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchSession = async () => {
      const [s, loadedQuestions] = await Promise.all([
        requestedMode === "freeplay"
          ? loadFreeplaySession()
          : loadSession(),
        fetchQuestions(),
      ]);
      if (!s) {
        router.dismiss();
        return;
      }
      setQuestions(loadedQuestions);
      const loadedResults =
        s.results && s.results.length > 0
          ? s.results
          : new Array(s.questionIds.length).fill(null);
      const loadedSelectedAnswerIndices =
        s.selectedAnswerIndices && s.selectedAnswerIndices.length > 0
          ? s.selectedAnswerIndices
          : new Array(s.questionIds.length).fill(null);

      setSession({ ...s, selectedAnswerIndices: loadedSelectedAnswerIndices });
      setResults(loadedResults);

      if (loadedResults[s.currentIndex]) {
        setPhase("feedback");
        setIsNextReady(true);
      }

      setLoading(false);
    };
    fetchSession();
  }, [requestedMode, router]);

  const currentIndex = session?.currentIndex ?? 0;
  const questionIds = session?.questionIds ?? [];
  const questionId = questionIds[currentIndex];
  const question = questions.find((q) => q.id === questionId);

  const shuffledChoices = useMemo(() => {
    if (!question) return [];
    return question.choices
      .map((text, originalIndex) => ({ text, originalIndex }))
      .sort(() => 0.5 - Math.random());
  }, [question]);

  const domainTheme = useDomainTheme(question?.domain ?? "");

  // ─── Early returns ────────────────────────────────────────────────────────

  if (loading || !session) {
    return (
      <ScreenContainer
        edges={["top", "left", "right"]}
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!question) {
    return (
      <ScreenContainer
        edges={["top", "left", "right"]}
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <Text style={{ color: colors.textPrimary }}>
          Error: Question not found
        </Text>
        <Button title="Go Home" onPress={() => router.dismiss()} />
      </ScreenContainer>
    );
  }

  // ─── Derived state ────────────────────────────────────────────────────────

  const isRetryMode = session.retryMode === true;
  const isFreeplayMode = session.mode === "freeplay";
  const DomainIcon = domainTheme.icon;
  const answeredResult = results[currentIndex];
  const selectedAnswerIndex =
    selectedOriginalIndex ?? session.selectedAnswerIndices?.[currentIndex] ?? null;
  const selectedAnswer =
    selectedAnswerIndex !== null ? question.choices[selectedAnswerIndex] : null;
  const isMathQuestion = question.domain === "Math";
  const isCorrect = answeredResult
    ? answeredResult === "correct"
    : selectedAnswerIndex !== null &&
      selectedAnswerIndex === question.correctIndex;
  const isLastQuestion = currentIndex + 1 >= questionIds.length;

  const persistSession = async (nextSession: DailySession) => {
    if (nextSession.mode === "freeplay") {
      await saveFreeplaySession(nextSession);
      return;
    }

    await saveSession(nextSession);
  };

  // ─── Handlers  ────────────────────────────────────────────────────────────

  const handleChoice = async (originalIndex: number) => {
    if (phase !== "answering") return;

    const correct = originalIndex === question.correctIndex;
    const result: QuestionResult = correct ? "correct" : "incorrect";

    if (correct) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setSelectedOriginalIndex(originalIndex);

    const nextResults = [...results];
    nextResults[currentIndex] = result;
    setResults(nextResults);
    const nextSelectedAnswerIndices = [
      ...(session.selectedAnswerIndices ??
        new Array(session.questionIds.length).fill(null)),
    ];
    nextSelectedAnswerIndices[currentIndex] = originalIndex;

    const updatedSession = {
      ...session,
      status: "in-progress" as const,
      results: nextResults,
      selectedAnswerIndices: nextSelectedAnswerIndices,
    };
    if (correct && !isRetryMode) updatedSession.score += 1;

    setSession(updatedSession);
    await persistSession(updatedSession);

    if (!isRetryMode && !isFreeplayMode) {
      await updateQuestionStats(question.id, correct);
    }

    setPhase("feedback");

    setIsNextReady(false);
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start(() => {
      setIsNextReady(true);
    });
  };

  const handleNext = async () => {
    const finalSession = { ...session, results };

    if (isLastQuestion) {
      if (isRetryMode) {
        // Restore the original session with retry results attached
        const restoredSession: DailySession = {
          ...finalSession,
          retryMode: false,
          retryResults: results,
          retryQuestionIds: finalSession.questionIds,
          status: "completed",
          questionIds:
            finalSession.originalQuestionIds ?? finalSession.questionIds,
          results: finalSession.originalResults ?? finalSession.results,
          score: finalSession.originalScore ?? finalSession.score,
          selectedAnswerIndices:
            finalSession.originalSelectedAnswerIndices ??
            finalSession.selectedAnswerIndices,
          currentIndex: 0,
        };
        await persistSession(restoredSession);
        // Pop back to session-summary (which is below us in the stack)
        router.dismiss();
      } else if (isFreeplayMode) {
        const reshuffledIds = await buildShuffledQuestionIds();
        finalSession.questionIds = [
          ...finalSession.questionIds,
          ...reshuffledIds,
        ];
        finalSession.results = [
          ...(finalSession.results ?? []),
          ...new Array(reshuffledIds.length).fill(null),
        ];
        finalSession.selectedAnswerIndices = [
          ...(finalSession.selectedAnswerIndices ?? []),
          ...new Array(reshuffledIds.length).fill(null),
        ];
        finalSession.currentIndex += 1;
        await persistSession(finalSession);
        setSession(finalSession);
        setSelectedOriginalIndex(null);
        setPhase("answering");
      } else {
        await completeSession(finalSession);
        router.replace("/session-summary");
      }
    } else {
      finalSession.currentIndex += 1;
      await persistSession(finalSession);
      setSession(finalSession);
      setSelectedOriginalIndex(null);
      setPhase("answering");
    }
  };

  const handleExit = async () => {
    // If we're in retry mode, restore the original session before leaving
    // so the home screen and summary show the correct original score
    if (session.retryMode) {
      const restoredSession: DailySession = {
        ...session,
        retryMode: false,
        status: "completed",
        questionIds: session.originalQuestionIds ?? session.questionIds,
        results: session.originalResults ?? session.results,
        score: session.originalScore ?? session.score,
        selectedAnswerIndices:
          session.originalSelectedAnswerIndices ??
          session.selectedAnswerIndices,
        currentIndex: 0,
      };
      await persistSession(restoredSession);
    }
    router.dismiss();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      style={styles.outerContainer}
    >
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      {/* ── Custom header bar ── */}
      <View style={styles.customHeader}>
        <View style={styles.customHeaderSpacer} />
        <Text style={[styles.customHeaderTitle, { color: colors.textPrimary }]}>
          {isRetryMode
            ? "Practice Round"
            : isFreeplayMode
              ? "Freeplay"
              : "Daily Session"}
        </Text>
        <TouchableOpacity
          onPress={handleExit}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={20} color={colors.textTertiary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ── Practice mode banner ── */}
      {(isRetryMode || isFreeplayMode) && (
        <View
          style={[
            styles.practiceBanner,
            {
              backgroundColor: colors.warning + "18",
              borderBottomColor: colors.warning + "40",
            },
          ]}
        >
          <Text style={[styles.practiceBannerText, { color: colors.warning }]}>
            {isFreeplayMode
              ? "Freeplay Mode — answers won't be saved"
              : "Practice Mode — answers won't be saved"}
          </Text>
        </View>
      )}

      {/* ── Fixed progress timeline header ── */}
      {isFreeplayMode ? (
        <View
          style={[
            styles.freeplayHeader,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.freeplayMetric,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.freeplayMetricLabel,
                { color: colors.textTertiary },
              ]}
            >
              Question
            </Text>
            <Text
              style={[
                styles.freeplayMetricValue,
                { color: colors.textPrimary },
              ]}
            >
              {currentIndex + 1}
            </Text>
          </View>
          <View
            style={[
              styles.freeplayMetric,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.freeplayMetricLabel,
                { color: colors.textTertiary },
              ]}
            >
              Score
            </Text>
            <Text
              style={[
                styles.freeplayMetricValue,
                { color: colors.textPrimary },
              ]}
            >
              {session.score}
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.timelineHeader,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <ProgressTimeline
            total={questionIds.length}
            currentIndex={currentIndex}
            results={results}
            colors={colors}
          />
        </View>
      )}

      {/* ── Scrollable quiz body ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Badges Row ── */}
        <View style={styles.badgesRow}>
          <View
            style={[
              styles.domainBadge,
              {
                backgroundColor: domainTheme.tint,
                borderColor: domainTheme.accent,
              },
            ]}
          >
            <DomainIcon size={14} color={domainTheme.accent} strokeWidth={2} />
            <Text style={[styles.domainLabel, { color: domainTheme.accent }]}>
              {question.domain}
            </Text>
          </View>

          {session?.questionTypes?.[question.id] && (
            <View
              style={[
                styles.typeBadge,
                session.questionTypes[question.id] === "new" && {
                  backgroundColor: colors.primary + "18",
                  borderColor: colors.primary + "30",
                },
                session.questionTypes[question.id] === "missed" && {
                  backgroundColor: colors.incorrect + "18",
                  borderColor: colors.incorrect + "30",
                },
                session.questionTypes[question.id] === "resurfaced" && {
                  backgroundColor: colors.correct + "18",
                  borderColor: colors.correct + "30",
                },
              ]}
            >
              {session.questionTypes[question.id] === "new" && (
                <Sparkles size={14} color={colors.primary} strokeWidth={2} />
              )}
              {session.questionTypes[question.id] === "missed" && (
                <Target size={14} color={colors.incorrect} strokeWidth={2} />
              )}
              {session.questionTypes[question.id] === "resurfaced" && (
                <RotateCcw size={14} color={colors.correct} strokeWidth={2} />
              )}
              <Text
                style={[
                  styles.typeBadgeText,
                  session.questionTypes[question.id] === "new" && {
                    color: colors.primary,
                  },
                  session.questionTypes[question.id] === "missed" && {
                    color: colors.incorrect,
                  },
                  session.questionTypes[question.id] === "resurfaced" && {
                    color: colors.correct,
                  },
                ]}
              >
                {session.questionTypes[question.id] === "new"
                  ? "New Question"
                  : session.questionTypes[question.id] === "missed"
                    ? "Previously Missed"
                    : "Knowledge Check"}
              </Text>
            </View>
          )}
        </View>

        {/* ── Question prompt ── */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {question.prompt}
        </Text>

        {/* ══════════════════════════════════════════════════════════════════════
            PHASE: answering — show the shuffled choices
            ══════════════════════════════════════════════════════════════════════ */}
        {isMathQuestion && (
          <View
            style={[
              styles.mentalMathNote,
              {
                backgroundColor: domainTheme.tint,
                borderColor: domainTheme.accent + "26",
              },
            ]}
          >
            <Brain size={16} color={domainTheme.accent} strokeWidth={2} />
            <Text
              style={[
                styles.mentalMathNoteText,
                { color: colors.textSecondary },
              ]}
            >
              Mental math only. No calculator.
            </Text>
          </View>
        )}

        {phase === "answering" && (
          <View style={styles.choicesContainer}>
            {shuffledChoices.map((choiceObj, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.choiceButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: domainTheme.accent + "30",
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => handleChoice(choiceObj.originalIndex)}
              >
                <View style={styles.choiceInner}>
                  <View
                    style={[
                      styles.choiceLetter,
                      { backgroundColor: domainTheme.tint },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceLetterText,
                        { color: domainTheme.accent },
                      ]}
                    >
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.choiceText, { color: colors.textPrimary }]}
                  >
                    {choiceObj.text}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            PHASE: feedback — show result inline
            ══════════════════════════════════════════════════════════════════════ */}
        {phase === "feedback" && (
          <View style={styles.feedbackContainer}>
            <View
              style={[
                styles.resultIconWrap,
                {
                  backgroundColor: isCorrect
                    ? colors.correct + "18"
                    : colors.incorrect + "18",
                },
              ]}
            >
              {isCorrect ? (
                <Check size={28} color={colors.correct} strokeWidth={2.5} />
              ) : (
                <X size={28} color={colors.incorrect} strokeWidth={2.5} />
              )}
            </View>

            <Text
              style={[
                styles.resultLabel,
                { color: isCorrect ? colors.correct : colors.incorrect },
              ]}
            >
              {isCorrect ? "Correct!" : "Incorrect"}
            </Text>

            {!isCorrect && selectedAnswer && (
              <View
                style={[
                  styles.correctAnswerCard,
                  {
                    backgroundColor: colors.incorrect + "10",
                    borderLeftColor: colors.incorrect,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.correctAnswerHint,
                    { color: colors.incorrect },
                  ]}
                >
                  Your answer
                </Text>
                <Text
                  style={[
                    styles.correctAnswerText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {selectedAnswer}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.correctAnswerCard,
                {
                  backgroundColor: isCorrect
                    ? colors.correct + "12"
                    : colors.primary + "12",
                  borderLeftColor: isCorrect
                    ? colors.correct
                    : colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.correctAnswerHint,
                  { color: isCorrect ? colors.correct : colors.primary },
                ]}
              >
                {isCorrect ? "Your answer" : "Correct answer"}
              </Text>
              <Text
                style={[
                  styles.correctAnswerText,
                  { color: colors.textPrimary },
                ]}
              >
                {question.choices[question.correctIndex]}
              </Text>
            </View>

            <View
              style={[
                styles.explanationBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.explanationText,
                  { color: colors.textSecondary },
                ]}
              >
                {question.explanation}
              </Text>
              {question.learnMoreQueries &&
              question.learnMoreQueries.length > 0 ? (
                <View style={styles.queriesContainer}>
                  {question.learnMoreQueries.map((query, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.searchLink,
                        { backgroundColor: colors.primary + "15" },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        Linking.openURL(
                          `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                        );
                      }}
                    >
                      <Search
                        size={14}
                        color={colors.primary}
                        strokeWidth={2.5}
                      />
                      <Text
                        style={[
                          styles.searchLinkText,
                          { color: colors.primary },
                        ]}
                      >
                        {query}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.searchLink,
                    { backgroundColor: colors.primary + "15" },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    const searchTerm =
                      question.tags?.[0]?.replace(/-/g, " ") ||
                      question.subdomain ||
                      question.domain;
                    Linking.openURL(
                      `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`,
                    );
                  }}
                >
                  <Search size={14} color={colors.primary} strokeWidth={2.5} />
                  <Text
                    style={[styles.searchLinkText, { color: colors.primary }]}
                  >
                    Learn more about{" "}
                    {question.tags?.[0]?.replace(/-/g, " ") ||
                      question.subdomain}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Fixed bottom Next button (feedback phase only) ── */}
      {phase === "feedback" && (
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.md),
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                backgroundColor: isCorrect ? colors.correct : colors.primary,
                opacity: isNextReady ? 1 : 0.8,
                overflow: "hidden",
              },
            ]}
            activeOpacity={0.8}
            onPress={handleNext}
            disabled={!isNextReady}
          >
            {!isNextReady && (
              <Animated.View
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                }}
              />
            )}
            <Text
              style={[styles.nextButtonText, { color: colors.textInverse }]}
            >
              {isLastQuestion && !isFreeplayMode
                ? "Finish Session"
                : "Next Question"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* ── Layout ── */
  outerContainer: {
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.md,
  },
  customHeaderSpacer: {
    width: 28, // matches the X button size so title stays centered
  },
  customHeaderTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
    flex: 1,
  },
  freeplayHeader: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  freeplayMetric: {
    minWidth: 92,
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  freeplayMetricLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  freeplayMetricValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  timelineHeader: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    alignItems: "center",
  },

  /* ── Domain badge ── */
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
    width: "100%",
  },
  domainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  domainLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  /* ── Question prompt ── */
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
    textAlign: "left",
    lineHeight: 28,
    width: "100%",
  },

  /* ── Answer choices ── */
  mentalMathNote: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  mentalMathNoteText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  choicesContainer: {
    width: "100%",
    gap: Spacing.sm,
  },
  choiceButton: {
    borderRadius: Radius.md,
    borderWidth: 1,
    ...Shadow.card,
  },
  choiceInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  choiceLetter: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  choiceLetterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  choiceText: {
    flex: 1,
    fontSize: FontSize.base,
  },

  /* ── Feedback phase ── */
  feedbackContainer: {
    width: "100%",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  resultLabel: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  correctAnswerCard: {
    width: "100%",
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
  },
  correctAnswerHint: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  correctAnswerText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },

  /* ── Explanation Box ── */
  explanationBox: {
    width: "100%",
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  explanationText: {
    fontSize: FontSize.base,
    lineHeight: LineHeight.relaxed,
  },
  queriesContainer: {
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  searchLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  searchLinkText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  /* ── Fixed bottom bar ── */
  bottomBar: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nextButton: {
    width: "100%",
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  /* ── Practice mode banner ── */
  practiceBanner: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  practiceBannerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
});
