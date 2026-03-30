import { ScreenContainer } from "@/components/screen-container";
import { getThemeForDomain } from "@/constants/domain-themes";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Check, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

  const [session, setSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("answering");
  const [selectedOriginalIndex, setSelectedOriginalIndex] = useState<
    number | null
  >(null);
  // Track per-question results so dots can show correct/incorrect for past questions
  const [results, setResults] = useState<(QuestionResult | null)[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
      const s = await loadSession();
      if (!s) {
        router.replace("/");
        return;
      }
      setSession(s);
      setResults(new Array(s.questionIds.length).fill(null));
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

  const DomainIcon = domainTheme.icon;
  const isCorrect =
    selectedOriginalIndex !== null &&
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
    setResults((prev) => {
      const next = [...prev];
      next[currentIndex] = result;
      return next;
    });

    // Update session score & persist stats
    const updatedSession = { ...session, status: "in-progress" as const };
    if (correct) updatedSession.score += 1;
    setSession(updatedSession);

    await updateQuestionStats(question.id, correct);

    setPhase("feedback");
  };

  const handleNext = async () => {
    const finalSession = { ...session };

    if (isLastQuestion) {
      await completeSession(finalSession);
      router.replace("/session-summary");
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
    <ScreenContainer style={styles.outerContainer}>
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

        {/* ── Subdomain / tag pills (single-line, horizontally scrollable) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsScroll}
          style={styles.tagsContainer}
        >
          {question.subdomain && (
            <Text style={styles.tag}>{question.subdomain}</Text>
          )}
          {question.tags?.map((tag, i) => (
            <Text key={i} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </ScrollView>

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

            {/* Correct answer hint (only when wrong) */}
            {!isCorrect && (
              <View style={styles.correctAnswerCard}>
                <Text style={styles.correctAnswerHint}>Correct answer</Text>
                <Text style={styles.correctAnswerText}>
                  {question.choices[question.correctIndex]}
                </Text>
              </View>
            )}

            {/* Explanation — always visible */}
            <Text style={styles.explanation}>{question.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Fixed bottom Next button (feedback phase only) ── */}
      {phase === "feedback" && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              {
                backgroundColor: isCorrect ? Colors.correct : Colors.primary,
              },
            ]}
            activeOpacity={0.8}
            onPress={handleNext}
          >
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
  domainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  domainLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  /* ── Subdomain / tag pills (single-line) ── */
  tagsContainer: {
    flexGrow: 0,
    marginBottom: Spacing.md,
  },
  tagsScroll: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  tag: {
    fontSize: FontSize.xs,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    overflow: "hidden",
    color: Colors.textTertiary,
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

  /* ── Explanation ── */
  explanation: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: LineHeight.relaxed,
    textAlign: "center",
  },

  /* ── Fixed bottom bar ── */
  bottomBar: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
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
});
