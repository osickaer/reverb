import { ScreenContainer } from "@/components/screen-container";
import { getThemeForDomain } from "@/constants/domain-themes";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import {
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
  Colors,
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "../constants/theme";
import { seedQuestions } from "../data/questions";
import {
  DailySession,
  completeSession,
  loadSession,
  saveSession,
  updateQuestionStats,
} from "../utils/storage";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase = "answering" | "feedback";

// Per-question result stored so the progress dots can reflect history
type QuestionResult = "correct" | "incorrect";

// ─── Progress timeline ────────────────────────────────────────────────────────
// Renders:  ✓ — 2 — 3 — 4 — 5
// Past questions become a small Check or X icon.
// The current step shows a bold number.
// Future steps are muted numbers.

function ProgressTimeline({
  total,
  currentIndex,
  results,
}: {
  total: number;
  currentIndex: number;
  results: (QuestionResult | null)[];
}) {
  return (
    <View style={tlStyles.row}>
      {Array.from({ length: total }).map((_, i) => {
        const result = results[i];
        const isCurrent = i === currentIndex;
        const isPast = result !== null;

        return (
          <View key={i} style={tlStyles.item}>
            {/* Connector line before each step (except first) */}
            {i > 0 && (
              <View
                style={[
                  tlStyles.line,
                  isPast && {
                    backgroundColor:
                      result === "correct" ? Colors.correct : Colors.incorrect,
                  },
                ]}
              />
            )}

            {/* Node */}
            {isPast ? (
              // Small icon — check for correct, X for incorrect
              <View style={tlStyles.iconWrap}>
                {result === "correct" ? (
                  <Check size={14} color={Colors.correct} strokeWidth={2.5} />
                ) : (
                  <X size={14} color={Colors.incorrect} strokeWidth={2.5} />
                )}
              </View>
            ) : (
              // Number — bold for current, muted for future
              <View style={tlStyles.numberWrap}>
                <Text
                  style={[
                    tlStyles.number,
                    isCurrent ? tlStyles.numberCurrent : tlStyles.numberFuture,
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
    backgroundColor: Colors.border,
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
    color: Colors.textPrimary,
  },
  numberFuture: {
    fontWeight: FontWeight.regular,
    color: Colors.textTertiary,
  },
});

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function QuizScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [session, setSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("answering");
  const [selectedOriginalIndex, setSelectedOriginalIndex] = useState<
    number | null
  >(null);
  // Track per-question results so dots can show correct/incorrect for past questions
  const [results, setResults] = useState<(QuestionResult | null)[]>([]);

  // Next button transition force delay state
  const [isNextReady, setIsNextReady] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchSession = async () => {
      const s = await loadSession();
      if (!s) {
        router.replace("/");
        return;
      }
      const loadedResults =
        s.results && s.results.length > 0
          ? s.results
          : new Array(s.questionIds.length).fill(null);

      setSession(s);
      setResults(loadedResults);

      if (loadedResults[s.currentIndex]) {
        setPhase("feedback");
        setIsNextReady(true);
      }

      setLoading(false);
    };
    fetchSession();
  }, [router]);

  const currentIndex = session?.currentIndex ?? 0;
  const questionIds = session?.questionIds ?? [];
  const questionId = questionIds[currentIndex];
  const question = seedQuestions.find((q) => q.id === questionId);

  // Must be called unconditionally before any early returns
  const shuffledChoices = useMemo(() => {
    if (!question) return [];
    return question.choices
      .map((text, originalIndex) => ({ text, originalIndex }))
      .sort(() => 0.5 - Math.random());
  }, [question?.id]);

  const domainTheme = useMemo(
    () => getThemeForDomain(question?.domain ?? ""),
    [question?.domain],
  );

  // ─── Early returns ────────────────────────────────────────────────────────

  if (loading || !session) {
    return (
      <ScreenContainer
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </ScreenContainer>
    );
  }

  if (!question) {
    return (
      <ScreenContainer
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <Text>Error: Question not found</Text>
        <Button title="Go Home" onPress={() => router.replace("/")} />
      </ScreenContainer>
    );
  }

  // ─── Derived state ────────────────────────────────────────────────────────

  const isRetryMode = session.retryMode === true;
  const DomainIcon = domainTheme.icon;
  const answeredResult = results[currentIndex];
  const isCorrect = answeredResult
    ? answeredResult === "correct"
    : selectedOriginalIndex !== null &&
      selectedOriginalIndex === question.correctIndex;
  const isLastQuestion = currentIndex + 1 >= questionIds.length;

  // ─── Handlers  ────────────────────────────────────────────────────────────

  const handleChoice = async (originalIndex: number) => {
    if (phase !== "answering") return;

    const correct = originalIndex === question.correctIndex;
    const result: QuestionResult = correct ? "correct" : "incorrect";

    // Haptic feedback — success ping for correct, error thud for wrong
    if (correct) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setSelectedOriginalIndex(originalIndex);

    // Record result in the timeline array
    const nextResults = [...results];
    nextResults[currentIndex] = result;
    setResults(nextResults);

    // Update session score & persist stats
    const updatedSession = {
      ...session,
      status: "in-progress" as const,
      results: nextResults,
    };
    if (correct && !isRetryMode) updatedSession.score += 1;

    setSession(updatedSession);
    await saveSession(updatedSession);

    // In retry mode, don't persist stats — answers are practice-only
    if (!isRetryMode) {
      await updateQuestionStats(question.id, correct);
    }

    setPhase("feedback");

    // Force reflection delay
    setIsNextReady(false);
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000, // 3 seconds delay
      useNativeDriver: false,
    }).start(() => {
      setIsNextReady(true);
    });
  };

  const handleNext = async () => {
    const finalSession = { ...session, results };

    if (isLastQuestion) {
      if (isRetryMode) {
        // Restore the original session and attach retry results
        const restoredSession: DailySession = {
          ...finalSession,
          retryMode: false,
          retryResults: results,
          status: "completed",
          // Restore original data
          questionIds:
            finalSession.originalQuestionIds ?? finalSession.questionIds,
          results: finalSession.originalResults ?? finalSession.results,
          score: finalSession.originalScore ?? finalSession.score,
          currentIndex: 0,
        };
        await saveSession(restoredSession);
        router.replace("/session-summary");
      } else {
        await completeSession(finalSession);
        router.replace("/session-summary");
      }
    } else {
      finalSession.currentIndex += 1;
      await saveSession(finalSession);
      setSession(finalSession);
      // Reset for next question
      setSelectedOriginalIndex(null);
      setPhase("answering");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScreenContainer edges={["left", "right"]} style={styles.outerContainer}>
      <Stack.Screen
        options={{
          headerBackTitle: "Home",
          title: isRetryMode ? "Practice Round" : "Daily Session",
        }}
      />

      {/* ── Practice mode banner ── */}
      {isRetryMode && (
        <View style={styles.practiceBanner}>
          <Text style={styles.practiceBannerText}>
            Practice Mode — answers won't be saved
          </Text>
        </View>
      )}

      {/* ── Fixed progress timeline header ── */}
      <View style={styles.timelineHeader}>
        <ProgressTimeline
          total={questionIds.length}
          currentIndex={currentIndex}
          results={results}
        />
      </View>

      {/* ── Scrollable quiz body ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Badges Row ── */}
        <View style={styles.badgesRow}>
          {/* ── Domain badge ── */}
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

          {/* ── Type badge ── */}
          {session?.questionTypes?.[question.id] && (
            <View
              style={[
                styles.typeBadge,
                session.questionTypes[question.id] === "new" && {
                  backgroundColor: Colors.primary + "18",
                  borderColor: Colors.primary + "30",
                },
                session.questionTypes[question.id] === "missed" && {
                  backgroundColor: Colors.incorrect + "18",
                  borderColor: Colors.incorrect + "30",
                },
                session.questionTypes[question.id] === "resurfaced" && {
                  backgroundColor: Colors.correct + "18",
                  borderColor: Colors.correct + "30",
                },
              ]}
            >
              {session.questionTypes[question.id] === "new" && (
                <Sparkles size={14} color={Colors.primary} strokeWidth={2} />
              )}
              {session.questionTypes[question.id] === "missed" && (
                <Target size={14} color={Colors.incorrect} strokeWidth={2} />
              )}
              {session.questionTypes[question.id] === "resurfaced" && (
                <RotateCcw size={14} color={Colors.correct} strokeWidth={2} />
              )}
              <Text
                style={[
                  styles.typeBadgeText,
                  session.questionTypes[question.id] === "new" && {
                    color: Colors.primary,
                  },
                  session.questionTypes[question.id] === "missed" && {
                    color: Colors.incorrect,
                  },
                  session.questionTypes[question.id] === "resurfaced" && {
                    color: Colors.correct,
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
        <Text style={styles.title}>{question.prompt}</Text>

        {/* ══════════════════════════════════════════════════════════════════════
            PHASE: answering — show the shuffled choices
            ══════════════════════════════════════════════════════════════════════ */}
        {phase === "answering" && (
          <View style={styles.choicesContainer}>
            {shuffledChoices.map((choiceObj, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.choiceButton,
                  { borderColor: domainTheme.accent + "30" },
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
                  <Text style={styles.choiceText}>{choiceObj.text}</Text>
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
            {/* Result icon + label */}
            <View
              style={[
                styles.resultIconWrap,
                {
                  backgroundColor: isCorrect
                    ? Colors.correct + "18"
                    : Colors.incorrect + "18",
                },
              ]}
            >
              {isCorrect ? (
                <Check size={28} color={Colors.correct} strokeWidth={2.5} />
              ) : (
                <X size={28} color={Colors.incorrect} strokeWidth={2.5} />
              )}
            </View>

            <Text
              style={[
                styles.resultLabel,
                { color: isCorrect ? Colors.correct : Colors.incorrect },
              ]}
            >
              {isCorrect ? "Correct!" : "Incorrect"}
            </Text>

            {/* Correct answer — always shown */}
            <View
              style={[
                styles.correctAnswerCard,
                isCorrect && {
                  backgroundColor: Colors.correct + "12",
                  borderLeftColor: Colors.correct,
                },
              ]}
            >
              <Text
                style={[
                  styles.correctAnswerHint,
                  isCorrect && { color: Colors.correct },
                ]}
              >
                {isCorrect ? "Your answer" : "Correct answer"}
              </Text>
              <Text style={styles.correctAnswerText}>
                {question.choices[question.correctIndex]}
              </Text>
            </View>

            {/* Explanation — always visible */}
            <View style={styles.explanationBox}>
              <Text style={styles.explanationText}>{question.explanation}</Text>
              {question.learnMoreQueries &&
              question.learnMoreQueries.length > 0 ? (
                <View style={styles.queriesContainer}>
                  {question.learnMoreQueries.map((query, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchLink}
                      activeOpacity={0.7}
                      onPress={() => {
                        Linking.openURL(
                          `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                        );
                      }}
                    >
                      <Search
                        size={14}
                        color={Colors.primary}
                        strokeWidth={2.5}
                      />
                      <Text style={styles.searchLinkText}>{query}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.searchLink}
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
                  <Search size={14} color={Colors.primary} strokeWidth={2.5} />
                  <Text style={styles.searchLinkText}>
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
            { paddingBottom: Math.max(insets.bottom, Spacing.md) },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                backgroundColor: isCorrect ? Colors.correct : Colors.primary,
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
            <Text style={styles.nextButtonText}>
              {isLastQuestion ? "Finish Session" : "Next Question"}
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
  timelineHeader: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
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
    marginBottom: Spacing.sm,
    flexWrap: "wrap",
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
    textAlign: "center",
    color: Colors.textPrimary,
    lineHeight: 28,
  },

  /* ── Answer choices ── */
  choicesContainer: {
    width: "100%",
    gap: Spacing.sm,
  },
  choiceButton: {
    backgroundColor: Colors.surface,
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
    color: Colors.textPrimary,
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
    backgroundColor: Colors.incorrect + "12",
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.incorrect,
  },
  correctAnswerHint: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.incorrect,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  correctAnswerText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  /* ── Explanation Box ── */
  explanationBox: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  explanationText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  searchLinkText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  /* ── Fixed bottom bar ── */
  bottomBar: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
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
    color: Colors.textInverse,
  },

  /* ── Practice mode banner ── */
  practiceBanner: {
    backgroundColor: Colors.warning + "18",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.screen,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.warning + "40",
  },
  practiceBannerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
    letterSpacing: 0.3,
  },
});
