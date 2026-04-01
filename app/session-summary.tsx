import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Home,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Lock,
  Info,
} from "lucide-react-native";
import { loadSession, DailySession, saveSession } from "../utils/storage";
import { seedQuestions } from "../data/questions";
import { getThemeForDomain } from "../constants/domain-themes";
import {
  Colors,
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "../constants/theme";
import { ScreenContainer } from "@/components/screen-container";
import { ScoreRing } from "@/components/score-ring";

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

const typeConfig = {
  new: { label: "New", Icon: Sparkles, color: Colors.primary },
  missed: { label: "Previously Missed", Icon: Target, color: Colors.incorrect },
  resurfaced: { label: "Knowledge Check", Icon: RotateCcw, color: Colors.correct },
};

function TypeBreakdownRow({
  type,
  correctCount,
  totalCount,
}: {
  type: "new" | "missed" | "resurfaced";
  correctCount: number;
  totalCount: number;
}) {
  const config = typeConfig[type];
  const IconComponent = config.Icon;
  const missedCount = totalCount - correctCount;

  return (
    <View style={styles.typeRow}>
      <View style={[styles.typeIconWrap, { backgroundColor: config.color + "15" }]}>
        <IconComponent size={16} color={config.color} strokeWidth={2} />
      </View>
      <View style={styles.typeRowContent}>
        <Text style={styles.typeLabel}>{config.label}</Text>
        <Text style={styles.typeDetail}>
          {totalCount} question{totalCount !== 1 ? "s" : ""} —{" "}
          <Text style={{ color: Colors.correct, fontWeight: FontWeight.semibold }}>
            {correctCount} correct
          </Text>
          {missedCount > 0 && (
            <Text style={{ color: Colors.incorrect, fontWeight: FontWeight.semibold }}>
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
}: {
  domain: string;
  correct: number;
  total: number;
  improved: boolean;
}) {
  const theme = getThemeForDomain(domain);
  const DomainIcon = theme.icon;
  const pct = total > 0 ? correct / total : 0;

  return (
    <View style={styles.subjectRow}>
      <View style={[styles.subjectIconWrap, { backgroundColor: theme.tint }]}>
        <DomainIcon size={16} color={theme.accent} strokeWidth={2} />
      </View>
      <Text style={styles.subjectDomain}>{domain}</Text>
      <View style={styles.subjectRight}>
        {improved && (
          <View style={styles.improvedBadge}>
            <TrendingUp size={12} color={Colors.correct} strokeWidth={2.5} />
            <Text style={styles.improvedText}>Improved</Text>
          </View>
        )}
        <View style={styles.subjectBarTrack}>
          <View
            style={[
              styles.subjectBarFill,
              {
                width: `${Math.max(pct * 100, 8)}%`,
                backgroundColor:
                  pct >= 0.8 ? Colors.correct : pct >= 0.5 ? Colors.warning : Colors.incorrect,
              },
            ]}
          />
        </View>
        <Text style={styles.subjectFraction}>
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
  questionType,
}: {
  questionId: string;
  result: "correct" | "incorrect" | null;
  questionType?: "new" | "missed" | "resurfaced";
}) {
  const [expanded, setExpanded] = useState(false);
  const question = seedQuestions.find((q) => q.id === questionId);
  if (!question) return null;

  const theme = getThemeForDomain(question.domain);
  const DomainIcon = theme.icon;
  const isCorrect = result === "correct";

  const tConfig = questionType ? typeConfig[questionType] : null;
  const TypeIcon = tConfig?.Icon;

  return (
    <TouchableOpacity
      style={styles.reviewItem}
      activeOpacity={0.7}
      onPress={() => setExpanded(!expanded)}
    >
      <View style={styles.reviewItemHeader}>
        {/* Result icon */}
        <View
          style={[
            styles.reviewResultIcon,
            { backgroundColor: isCorrect ? Colors.correct + "18" : Colors.incorrect + "18" },
          ]}
        >
          {isCorrect ? (
            <Check size={14} color={Colors.correct} strokeWidth={2.5} />
          ) : (
            <X size={14} color={Colors.incorrect} strokeWidth={2.5} />
          )}
        </View>

        {/* Question text */}
        <Text style={styles.reviewPrompt} numberOfLines={expanded ? undefined : 1}>
          {question.prompt}
        </Text>

        {/* Expand chevron */}
        {expanded ? (
          <ChevronUp size={16} color={Colors.textTertiary} strokeWidth={2} />
        ) : (
          <ChevronDown size={16} color={Colors.textTertiary} strokeWidth={2} />
        )}
      </View>

      {/* Badges row */}
      <View style={styles.reviewBadges}>
        <View style={[styles.miniBadge, { backgroundColor: theme.tint, borderColor: theme.accent + "30" }]}>
          <DomainIcon size={11} color={theme.accent} strokeWidth={2} />
          <Text style={[styles.miniBadgeText, { color: theme.accent }]}>{question.domain}</Text>
        </View>
        {tConfig && TypeIcon && (
          <View
            style={[
              styles.miniBadge,
              { backgroundColor: tConfig.color + "12", borderColor: tConfig.color + "25" },
            ]}
          >
            <TypeIcon size={11} color={tConfig.color} strokeWidth={2} />
            <Text style={[styles.miniBadgeText, { color: tConfig.color }]}>{tConfig.label}</Text>
          </View>
        )}
      </View>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.reviewExpanded}>
          <View style={[styles.reviewCorrectAnswer, isCorrect && { backgroundColor: Colors.correct + "10", borderLeftColor: Colors.correct }]}>
            <Text style={[styles.reviewCorrectLabel, isCorrect && { color: Colors.correct }]}>
              {isCorrect ? "Your answer" : "Correct answer"}
            </Text>
            <Text style={styles.reviewCorrectText}>
              {question.choices[question.correctIndex]}
            </Text>
          </View>
          <Text style={styles.reviewExplanation}>{question.explanation}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Retry Results Mini-Summary ─────────────────────────────────────────────────

function RetryResultsCard({
  retryQuestionIds,
  retryResults,
}: {
  retryQuestionIds: string[];
  retryResults: ("correct" | "incorrect" | null)[];
}) {
  const retryCorrect = retryResults.filter((r) => r === "correct").length;
  const retryTotal = retryQuestionIds.length;

  return (
    <View style={styles.retryResultsCard}>
      <View style={styles.retryResultsHeader}>
        <View style={styles.retryResultsIconWrap}>
          <RefreshCw size={18} color={Colors.primary} strokeWidth={2} />
        </View>
        <View>
          <Text style={styles.retryResultsTitle}>Practice Round Results</Text>
          <Text style={styles.retryResultsSubtitle}>
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
                  { backgroundColor: isCorrect ? Colors.correct : Colors.incorrect },
                ]}
              >
                {isCorrect ? (
                  <Check size={10} color={Colors.textInverse} strokeWidth={3} />
                ) : (
                  <X size={10} color={Colors.textInverse} strokeWidth={3} />
                )}
              </View>
              <Text style={styles.retryResultText} numberOfLines={1}>
                {question.prompt}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.retryInfoNote}>
        <Info size={13} color={Colors.textTertiary} strokeWidth={2} />
        <Text style={styles.retryInfoText}>
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

  // Derived data
  const sessionData = useMemo(() => {
    if (!session) return null;

    const { questionIds, results, questionTypes, score } = session;
    const total = questionIds.length;

    // Question type breakdown
    const typeStats: Record<"new" | "missed" | "resurfaced", { correct: number; total: number }> = {
      new: { correct: 0, total: 0 },
      missed: { correct: 0, total: 0 },
      resurfaced: { correct: 0, total: 0 },
    };

    // Subject performance
    const subjectStats: Record<string, { correct: number; total: number; improved: boolean }> = {};

    questionIds.forEach((id, i) => {
      const qType = questionTypes?.[id] ?? "new";
      const result = results?.[i] ?? null;
      const question = seedQuestions.find((q) => q.id === id);

      // Type stats
      typeStats[qType].total += 1;
      if (result === "correct") typeStats[qType].correct += 1;

      // Subject stats
      const domain = question?.domain ?? "Unknown";
      if (!subjectStats[domain]) {
        subjectStats[domain] = { correct: 0, total: 0, improved: false };
      }
      subjectStats[domain].total += 1;
      if (result === "correct") subjectStats[domain].correct += 1;

      // Mark as improved if a previously missed question was answered correctly
      if (qType === "missed" && result === "correct") {
        subjectStats[domain].improved = true;
      }
    });

    // Missed question IDs for retry
    const missedIds = questionIds.filter((_, i) => results?.[i] === "incorrect");

    return { total, score, typeStats, subjectStats, missedIds };
  }, [session]);

  if (loading || !session || !sessionData) {
    return (
      <ScreenContainer style={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
      // Save original data for restore later
      originalQuestionIds: session.questionIds,
      originalResults: session.results ?? [],
      originalScore: session.score,
      // Override for retry quiz
      questionIds: missedIds,
      currentIndex: 0,
      results: new Array(missedIds.length).fill(null),
    };

    await saveSession(retrySession);
    router.push("/quiz");
  };

  return (
    <ScreenContainer edges={['left', 'right']} style={styles.outerContainer}>
      <Stack.Screen 
        options={{ 
          headerBackTitle: "Home", 
          title: "Session Review",
        }} 
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Score Hero ── */}
        <View style={styles.heroSection}>
          <ScoreRing score={score} total={total} />
          <Text style={styles.tagline}>{getTagline(score, total)}</Text>
        </View>

        {/* ── 2. Question Type Breakdown ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Question Breakdown</Text>
          {(["new", "missed", "resurfaced"] as const).map((type) =>
            typeStats[type].total > 0 ? (
              <TypeBreakdownRow
                key={type}
                type={type}
                correctCount={typeStats[type].correct}
                totalCount={typeStats[type].total}
              />
            ) : null,
          )}
        </View>

        {/* ── 3. Subject Performance ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subject Performance</Text>
          {Object.entries(subjectStats).map(([domain, stats]) => (
            <SubjectRow
              key={domain}
              domain={domain}
              correct={stats.correct}
              total={stats.total}
              improved={stats.improved}
            />
          ))}
        </View>

        {/* ── 4. Question Review List ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Question Review</Text>
          {session.questionIds.map((id, i) => (
            <QuestionReviewItem
              key={id}
              questionId={id}
              result={session.results?.[i] ?? null}
              questionType={session.questionTypes?.[id]}
            />
          ))}
        </View>

        {/* ── Retry Results (if returning from practice round) ── */}
        {hasRetryResults && (
          <RetryResultsCard
            retryQuestionIds={session.retryQuestionIds!}
            retryResults={session.retryResults!}
          />
        )}

        {/* ── 5. Retry Missed CTA ── */}
        {missedIds.length > 0 && (
          <View style={styles.retrySection}>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.8} onPress={handleRetry}>
              <RefreshCw size={18} color={Colors.textInverse} strokeWidth={2.5} />
              <Text style={styles.retryButtonText}>
                Retry Missed Questions ({missedIds.length})
              </Text>
            </TouchableOpacity>
            <View style={styles.retryDisclaimer}>
              <Lock size={13} color={Colors.textTertiary} strokeWidth={2} />
              <Text style={styles.retryDisclaimerText}>
                Retried answers won't be saved — these questions will still appear as missed in
                future sessions so you get another real chance at them.
              </Text>
            </View>
          </View>
        )}

        {/* ── 6. Back to Home ── */}
        <TouchableOpacity
          style={styles.homeButton}
          activeOpacity={0.8}
          onPress={() => router.replace("/")}
        >
          <Home size={16} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.homeButtonText}>Back to Home</Text>
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
    color: Colors.textSecondary,
    marginTop: Spacing.base,
    textAlign: "center",
  },

  /* ── Card ── */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border + "60",
    ...Shadow.card,
  },
  cardTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  typeDetail: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
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
    color: Colors.textPrimary,
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
    backgroundColor: Colors.correct + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    gap: 3,
  },
  improvedText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.correct,
  },
  subjectBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border + "40",
    overflow: "hidden",
  },
  subjectBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  subjectFraction: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    width: 24,
    textAlign: "right",
  },

  /* ── Question Review ── */
  reviewItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border + "50",
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
    color: Colors.textPrimary,
    lineHeight: LineHeight.tight,
  },
  reviewBadges: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginLeft: 32, // align with text, past the icon
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
    backgroundColor: Colors.incorrect + "10",
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.incorrect,
  },
  reviewCorrectLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.incorrect,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reviewCorrectText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  reviewExplanation: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.normal,
    color: Colors.textSecondary,
  },

  /* ── Retry Results Card ── */
  retryResultsCard: {
    backgroundColor: Colors.primary + "08",
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
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
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  retryResultsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  retryResultsSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
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
    color: Colors.textSecondary,
  },
  retryInfoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.primary + "20",
  },
  retryInfoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textTertiary,
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
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  retryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textInverse,
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
    color: Colors.textTertiary,
  },

  /* ── Home Button ── */
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    backgroundColor: Colors.primary + "08",
    gap: Spacing.sm,
  },
  homeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
