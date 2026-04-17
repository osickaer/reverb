import { ScoreRing } from "@/components/score-ring";
import { ScreenContainer } from "@/components/screen-container";
import { useThemeColors } from "@/contexts/theme-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Home,
  Info,
  Lock,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDomainTheme } from "../constants/domain-themes";
import {
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "../constants/theme";
import { seedQuestions } from "../data/questions";
import { DailySession, loadSession, saveSession } from "../utils/storage";

// ─── Motivational tagline ───────────────────────────────────────────────────────

function getTagline(score: number, total: number): string {
  const pct = total > 0 ? score / total : 0;
  if (pct === 1) return "Perfect session! 🔥";
  if (pct >= 0.8) return "You're on fire! Great job.";
  if (pct >= 0.6) return "Solid work — keep building!";
  if (pct >= 0.4) return "Getting sharper every day.";
  return "Every session makes you stronger.";
}

// ─── Type Breakdown Row ─────────────────────────────────────────────────────────

function TypeBreakdownRow({
  type,
  correctCount,
  totalCount,
  colors,
}: {
  type: "new" | "missed" | "resurfaced";
  correctCount: number;
  totalCount: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const typeConfig = {
    new: { label: "New", Icon: Sparkles, color: colors.primary },
    missed: {
      label: "Previously Missed",
      Icon: Target,
      color: colors.incorrect,
    },
    resurfaced: {
      label: "Knowledge Check",
      Icon: RotateCcw,
      color: colors.correct,
    },
  };

  const config = typeConfig[type];
  const IconComponent = config.Icon;
  const missedCount = totalCount - correctCount;

  return (
    <View style={styles.typeRow}>
      <View
        style={[styles.typeIconWrap, { backgroundColor: config.color + "15" }]}
      >
        <IconComponent size={16} color={config.color} strokeWidth={2} />
      </View>
      <View style={styles.typeRowContent}>
        <Text style={[styles.typeLabel, { color: colors.textPrimary }]}>
          {config.label}
        </Text>
        <Text style={[styles.typeDetail, { color: colors.textTertiary }]}>
          {totalCount} question{totalCount !== 1 ? "s" : ""} —{" "}
          <Text
            style={{ color: colors.correct, fontWeight: FontWeight.semibold }}
          >
            {correctCount} correct
          </Text>
          {missedCount > 0 && (
            <Text
              style={{
                color: colors.incorrect,
                fontWeight: FontWeight.semibold,
              }}
            >
              , {missedCount} missed
            </Text>
          )}
        </Text>
      </View>
    </View>
  );
}

// ─── Subject Performance Row ────────────────────────────────────────────────────

function SubjectRow({
  domain,
  correct,
  total,
  improved,
  colors,
}: {
  domain: string;
  correct: number;
  total: number;
  improved: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const theme = useDomainTheme(domain);
  const DomainIcon = theme.icon;
  const pct = total > 0 ? correct / total : 0;

  return (
    <View style={styles.subjectRow}>
      <View style={[styles.subjectIconWrap, { backgroundColor: theme.tint }]}>
        <DomainIcon size={16} color={theme.accent} strokeWidth={2} />
      </View>
      <Text style={[styles.subjectDomain, { color: colors.textPrimary }]}>
        {domain}
      </Text>
      <View style={styles.subjectRight}>
        {improved && (
          <View
            style={[
              styles.improvedBadge,
              { backgroundColor: colors.correct + "15" },
            ]}
          >
            <TrendingUp size={12} color={colors.correct} strokeWidth={2.5} />
            <Text style={[styles.improvedText, { color: colors.correct }]}>
              Improved
            </Text>
          </View>
        )}
        <View
          style={[
            styles.subjectBarTrack,
            { backgroundColor: colors.border + "40" },
          ]}
        >
          <View
            style={[
              styles.subjectBarFill,
              {
                width: `${Math.max(pct * 100, 8)}%`,
                backgroundColor:
                  pct >= 0.8
                    ? colors.correct
                    : pct >= 0.5
                      ? colors.warning
                      : colors.incorrect,
              },
            ]}
          />
        </View>
        <Text style={[styles.subjectFraction, { color: colors.textTertiary }]}>
          {correct}/{total}
        </Text>
      </View>
    </View>
  );
}

// ─── Expandable Question Item ───────────────────────────────────────────────────

function QuestionReviewItem({
  questionId,
  result,
  selectedAnswerIndex,
  questionType,
  colors,
}: {
  questionId: string;
  result: "correct" | "incorrect" | null;
  selectedAnswerIndex?: number | null;
  questionType?: "new" | "missed" | "resurfaced";
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const question = seedQuestions.find((q) => q.id === questionId);
  if (!question) return null;

  const typeConfig = {
    new: { label: "New", Icon: Sparkles, color: colors.primary },
    missed: {
      label: "Previously Missed",
      Icon: Target,
      color: colors.incorrect,
    },
    resurfaced: {
      label: "Knowledge Check",
      Icon: RotateCcw,
      color: colors.correct,
    },
  };

  const theme = useDomainTheme(question.domain);
  const DomainIcon = theme.icon;
  const isCorrect = result === "correct";
  const selectedAnswer =
    selectedAnswerIndex !== null && selectedAnswerIndex !== undefined
      ? question.choices[selectedAnswerIndex]
      : null;

  const tConfig = questionType ? typeConfig[questionType] : null;
  const TypeIcon = tConfig?.Icon;

  return (
    <TouchableOpacity
      style={[styles.reviewItem, { borderBottomColor: colors.border + "50" }]}
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
    >
      <View style={styles.reviewItemHeader}>
        <View
          style={[
            styles.reviewResultIcon,
            {
              backgroundColor: isCorrect
                ? colors.correct + "18"
                : colors.incorrect + "18",
            },
          ]}
        >
          {isCorrect ? (
            <Check size={14} color={colors.correct} strokeWidth={2.5} />
          ) : (
            <X size={14} color={colors.incorrect} strokeWidth={2.5} />
          )}
        </View>

        <Text
          style={[styles.reviewPrompt, { color: colors.textPrimary }]}
          numberOfLines={expanded ? undefined : 1}
        >
          {question.prompt}
        </Text>

        {expanded ? (
          <ChevronUp size={16} color={colors.textTertiary} strokeWidth={2} />
        ) : (
          <ChevronDown size={16} color={colors.textTertiary} strokeWidth={2} />
        )}
      </View>

      <View style={styles.reviewBadges}>
        <View
          style={[
            styles.miniBadge,
            { backgroundColor: theme.tint, borderColor: theme.accent + "30" },
          ]}
        >
          <DomainIcon size={11} color={theme.accent} strokeWidth={2} />
          <Text style={[styles.miniBadgeText, { color: theme.accent }]}>
            {question.domain}
          </Text>
        </View>
        {tConfig && TypeIcon && (
          <View
            style={[
              styles.miniBadge,
              {
                backgroundColor: tConfig.color + "12",
                borderColor: tConfig.color + "25",
              },
            ]}
          >
            <TypeIcon size={11} color={tConfig.color} strokeWidth={2} />
            <Text style={[styles.miniBadgeText, { color: tConfig.color }]}>
              {tConfig.label}
            </Text>
          </View>
        )}
      </View>

      {expanded && (
        <View style={styles.reviewExpanded}>
          {selectedAnswer && (
            <View
              style={[
                styles.reviewCorrectAnswer,
                {
                  backgroundColor: colors.incorrect + "10",
                  borderLeftColor: colors.incorrect,
                },
              ]}
            >
              <Text
                style={[
                  styles.reviewCorrectLabel,
                  { color: colors.incorrect },
                ]}
              >
                Your answer
              </Text>
              <Text
                style={[styles.reviewCorrectText, { color: colors.textPrimary }]}
              >
                {selectedAnswer}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.reviewCorrectAnswer,
              isCorrect && selectedAnswer
                ? {
                    backgroundColor: colors.correct + "10",
                    borderLeftColor: colors.correct,
                  }
                : {
                    backgroundColor: colors.primary + "10",
                    borderLeftColor: colors.primary,
                  },
            ]}
          >
            <Text
              style={[
                styles.reviewCorrectLabel,
                { color: isCorrect ? colors.correct : colors.primary },
              ]}
            >
              {isCorrect ? "Your answer" : "Correct answer"}
            </Text>
            <Text
              style={[styles.reviewCorrectText, { color: colors.textPrimary }]}
            >
              {question.choices[question.correctIndex]}
            </Text>
          </View>
          <Text
            style={[styles.reviewExplanation, { color: colors.textSecondary }]}
          >
            {question.explanation}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Retry Results Mini-Summary ─────────────────────────────────────────────────

function RetryResultsCard({
  retryQuestionIds,
  retryResults,
  colors,
}: {
  retryQuestionIds: string[];
  retryResults: ("correct" | "incorrect" | null)[];
  colors: ReturnType<typeof useThemeColors>;
}) {
  const retryCorrect = retryResults.filter((r) => r === "correct").length;
  const retryTotal = retryQuestionIds.length;

  return (
    <View
      style={[
        styles.retryResultsCard,
        {
          backgroundColor: colors.primary + "08",
          borderColor: colors.primary + "20",
        },
      ]}
    >
      <View style={styles.retryResultsHeader}>
        <View
          style={[
            styles.retryResultsIconWrap,
            { backgroundColor: colors.primary + "15" },
          ]}
        >
          <RefreshCw size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View>
          <Text
            style={[styles.retryResultsTitle, { color: colors.textPrimary }]}
          >
            Practice Round Results
          </Text>
          <Text
            style={[
              styles.retryResultsSubtitle,
              { color: colors.textTertiary },
            ]}
          >
            You got {retryCorrect} of {retryTotal} correct on retry
          </Text>
        </View>
      </View>

      <View style={styles.retryResultsList}>
        {retryQuestionIds.map((id, i) => {
          const question = seedQuestions.find((q) => q.id === id);
          if (!question) return null;
          const isCorrect = retryResults[i] === "correct";
          return (
            <View key={id} style={styles.retryResultRow}>
              <View
                style={[
                  styles.retryResultDot,
                  {
                    backgroundColor: isCorrect
                      ? colors.correct
                      : colors.incorrect,
                  },
                ]}
              >
                {isCorrect ? (
                  <Check size={10} color={colors.textInverse} strokeWidth={3} />
                ) : (
                  <X size={10} color={colors.textInverse} strokeWidth={3} />
                )}
              </View>
              <Text
                style={[
                  styles.retryResultText,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {question.prompt}
              </Text>
            </View>
          );
        })}
      </View>

      <View
        style={[
          styles.retryInfoNote,
          { borderTopColor: colors.primary + "20" },
        ]}
      >
        <Info size={13} color={colors.textTertiary} strokeWidth={2} />
        <Text style={[styles.retryInfoText, { color: colors.textTertiary }]}>
          These results are for practice only and were not saved.
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────

export default function SessionSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [session, setSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const fetchSession = async () => {
        setLoading(true);
        const s = await loadSession();
        if (active) {
          setSession(s);
          setLoading(false);
        }
      };
      fetchSession();
      return () => {
        active = false;
      };
    }, []),
  );

  // Derived data
  const sessionData = useMemo(() => {
    if (!session) return null;

    const { questionIds, results, questionTypes, score } = session;
    const total = questionIds.length;

    const typeStats: Record<
      "new" | "missed" | "resurfaced",
      { correct: number; total: number }
    > = {
      new: { correct: 0, total: 0 },
      missed: { correct: 0, total: 0 },
      resurfaced: { correct: 0, total: 0 },
    };

    const subjectStats: Record<
      string,
      { correct: number; total: number; improved: boolean }
    > = {};

    questionIds.forEach((id, i) => {
      const qType = questionTypes?.[id] ?? "new";
      const result = results?.[i] ?? null;
      const question = seedQuestions.find((q) => q.id === id);

      typeStats[qType].total += 1;
      if (result === "correct") typeStats[qType].correct += 1;

      const domain = question?.domain ?? "Unknown";
      if (!subjectStats[domain]) {
        subjectStats[domain] = { correct: 0, total: 0, improved: false };
      }
      subjectStats[domain].total += 1;
      if (result === "correct") subjectStats[domain].correct += 1;

      if (qType === "missed" && result === "correct") {
        subjectStats[domain].improved = true;
      }
    });

    const missedIds = questionIds.filter(
      (_, i) => results?.[i] === "incorrect",
    );

    return { total, score, typeStats, subjectStats, missedIds };
  }, [session]);

  if (loading || !session || !sessionData) {
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

  const { total, score, typeStats, subjectStats, missedIds } = sessionData;
  const hasRetryResults =
    session.retryQuestionIds &&
    session.retryResults &&
    session.retryQuestionIds.length > 0;

  const handleRetry = async () => {
    if (missedIds.length === 0) return;

    const retrySession: DailySession = {
      ...session,
      retryMode: true,
      retryQuestionIds: missedIds,
      originalQuestionIds: session.questionIds,
      originalResults: session.results ?? [],
      originalScore: session.score,
      originalSelectedAnswerIndices: session.selectedAnswerIndices ?? [],
      questionIds: missedIds,
      currentIndex: 0,
      results: new Array(missedIds.length).fill(null),
      selectedAnswerIndices: new Array(missedIds.length).fill(null),
    };

    await saveSession(retrySession);
    // Push so summary stays in the stack — quiz dismiss will come back here
    router.push("/quiz");
  };

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
          Session Review
        </Text>
        <TouchableOpacity
          onPress={() => router.dismiss()}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={20} color={colors.textTertiary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Score Hero ── */}
        <View style={styles.heroSection}>
          <ScoreRing score={score} total={total} />
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            {getTagline(score, total)}
          </Text>
        </View>

        {/* ── 2. Question Type Breakdown ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border + "60",
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Question Breakdown
          </Text>
          {(["new", "missed", "resurfaced"] as const).map((type) =>
            typeStats[type].total > 0 ? (
              <TypeBreakdownRow
                key={type}
                type={type}
                correctCount={typeStats[type].correct}
                totalCount={typeStats[type].total}
                colors={colors}
              />
            ) : null,
          )}
        </View>

        {/* ── 3. Subject Performance ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border + "60",
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Subject Performance
          </Text>
          {Object.entries(subjectStats).map(([domain, stats]) => (
            <SubjectRow
              key={domain}
              domain={domain}
              correct={stats.correct}
              total={stats.total}
              improved={stats.improved}
              colors={colors}
            />
          ))}
        </View>

        {/* ── 4. Question Review List ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border + "60",
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Question Review
          </Text>
          {session.questionIds.map((id, i) => (
            <QuestionReviewItem
              key={id}
              questionId={id}
              result={session.results?.[i] ?? null}
              selectedAnswerIndex={session.selectedAnswerIndices?.[i] ?? null}
              questionType={session.questionTypes?.[id]}
              colors={colors}
            />
          ))}
        </View>

        {/* ── Retry Results (if returning from practice round) ── */}
        {hasRetryResults && (
          <RetryResultsCard
            retryQuestionIds={session.retryQuestionIds!}
            retryResults={session.retryResults!}
            colors={colors}
          />
        )}

        {/* ── 5. Retry Missed CTA ── */}
        {missedIds.length > 0 && (
          <View style={styles.retrySection}>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={handleRetry}
            >
              <RefreshCw
                size={18}
                color={colors.textInverse}
                strokeWidth={2.5}
              />
              <Text
                style={[styles.retryButtonText, { color: colors.textInverse }]}
              >
                Retry Missed Questions ({missedIds.length})
              </Text>
            </TouchableOpacity>
            <View style={styles.retryDisclaimer}>
              <Lock size={13} color={colors.textTertiary} strokeWidth={2} />
              <Text
                style={[
                  styles.retryDisclaimerText,
                  { color: colors.textTertiary },
                ]}
              >
                Retried answers won&apos;t be saved — these questions will still
                appear as missed in future sessions so you get another real
                chance at them.
              </Text>
            </View>
          </View>
        )}

        {/* ── 6. Back to Home ── */}
        <TouchableOpacity
          style={[
            styles.homeButton,
            {
              borderColor: colors.primary + "30",
              backgroundColor: colors.primary + "08",
            },
          ]}
          activeOpacity={0.8}
          onPress={() => router.dismiss()}
        >
          <Home size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.homeButtonText, { color: colors.primary }]}>
            Back to Home
          </Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.md,
  },
  customHeaderSpacer: {
    width: 28,
  },
  customHeaderTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
  },

  /* ── Score Hero ── */
  heroSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  tagline: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.base,
    textAlign: "center",
  },

  /* ── Card ── */
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    ...Shadow.card,
  },
  cardTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* ── Type Breakdown ── */
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  typeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  typeRowContent: {
    flex: 1,
  },
  typeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  typeDetail: {
    fontSize: FontSize.xs,
  },

  /* ── Subject Performance ── */
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  subjectIconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  subjectDomain: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    width: 80,
  },
  subjectRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  improvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    gap: 3,
  },
  improvedText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  subjectBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  subjectBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  subjectFraction: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    width: 24,
    textAlign: "right",
  },

  /* ── Question Review ── */
  reviewItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reviewItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reviewResultIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  reviewPrompt: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.tight,
  },
  reviewBadges: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginLeft: 32,
  },
  miniBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  reviewExpanded: {
    marginTop: Spacing.sm,
    marginLeft: 32,
    gap: Spacing.sm,
  },
  reviewCorrectAnswer: {
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderLeftWidth: 2,
  },
  reviewCorrectLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reviewCorrectText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  reviewExplanation: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.normal,
  },

  /* ── Retry Results Card ── */
  retryResultsCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
  },
  retryResultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  retryResultsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  retryResultsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  retryResultsSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  retryResultsList: {
    gap: Spacing.sm,
  },
  retryResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  retryResultDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  retryResultText: {
    flex: 1,
    fontSize: FontSize.xs,
  },
  retryInfoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  retryInfoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },

  /* ── Retry CTA ── */
  retrySection: {
    marginBottom: Spacing.base,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  retryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  retryDisclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  retryDisclaimerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },

  /* ── Home Button ── */
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  homeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
