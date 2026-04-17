import { ScoreRing } from "@/components/score-ring";
import { ScreenContainer } from "@/components/screen-container";
import { useDomainTheme } from "@/constants/domain-themes";
import { useThemeColors } from "@/contexts/theme-context";
import {
  CompletedSessionSnapshot,
  loadStats,
  UserStats,
} from "@/utils/storage";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  History,
  Sparkles,
  Target,
  RotateCcw,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "../constants/theme";
import { seedQuestions } from "../data/questions";

type HistoricalEntry = {
  date: string;
  score: number;
  total: number;
  snapshot?: CompletedSessionSnapshot;
};

function formatSessionDateLong(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function HistoricalQuestionItem({
  snapshot,
  index,
  colors,
}: {
  snapshot: CompletedSessionSnapshot;
  index: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const questionId = snapshot.questionIds[index];
  const question = seedQuestions.find((item) => item.id === questionId);
  const result = snapshot.results[index];
  const selectedAnswerIndex = snapshot.selectedAnswerIndices[index];
  const [expanded, setExpanded] = useState(false);

  if (!question) return null;

  const theme = useDomainTheme(question.domain);
  const DomainIcon = theme.icon;
  const isCorrect = result === "correct";
  const selectedAnswer =
    selectedAnswerIndex !== null && selectedAnswerIndex !== undefined
      ? question.choices[selectedAnswerIndex]
      : null;

  const type = snapshot.questionTypes?.[question.id];
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
  } as const;
  const tConfig = type ? typeConfig[type] : null;
  const TypeIcon = tConfig?.Icon;

  return (
    <TouchableOpacity
      style={[styles.questionItem, { borderBottomColor: colors.border + "50" }]}
      activeOpacity={0.75}
      onPress={() => setExpanded((value) => !value)}
    >
      <View style={styles.questionHeader}>
        <View
          style={[
            styles.resultIcon,
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
          style={[styles.questionPrompt, { color: colors.textPrimary }]}
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

      <View style={styles.questionBadges}>
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.tint, borderColor: theme.accent + "30" },
          ]}
        >
          <DomainIcon size={11} color={theme.accent} strokeWidth={2} />
          <Text style={[styles.badgeText, { color: theme.accent }]}>
            {question.domain}
          </Text>
        </View>

        {tConfig && TypeIcon && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: tConfig.color + "12",
                borderColor: tConfig.color + "25",
              },
            ]}
          >
            <TypeIcon size={11} color={tConfig.color} strokeWidth={2} />
            <Text style={[styles.badgeText, { color: tConfig.color }]}>
              {tConfig.label}
            </Text>
          </View>
        )}
      </View>

      {expanded && (
        <View style={styles.questionExpanded}>
          {selectedAnswer && (
            <View
              style={[
                styles.answerCard,
                {
                  backgroundColor: colors.primary + "10",
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.answerLabel, { color: colors.primary }]}>
                Your answer
              </Text>
              <Text style={[styles.answerText, { color: colors.textPrimary }]}>
                {selectedAnswer}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.answerCard,
              isCorrect && selectedAnswer
                ? {
                    backgroundColor: colors.correct + "10",
                    borderLeftColor: colors.correct,
                  }
                : {
                    backgroundColor: colors.incorrect + "10",
                    borderLeftColor: colors.incorrect,
                  },
            ]}
          >
            <Text
              style={[
                styles.answerLabel,
                { color: isCorrect ? colors.correct : colors.incorrect },
              ]}
            >
              Correct answer
            </Text>
            <Text style={[styles.answerText, { color: colors.textPrimary }]}>
              {question.choices[question.correctIndex]}
            </Text>
          </View>

          <Text style={[styles.explanation, { color: colors.textSecondary }]}>
            {question.explanation}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SessionCard({
  entry,
  colors,
}: {
  entry: HistoricalEntry;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = entry.total > 0 ? Math.round((entry.score / entry.total) * 100) : 0;
  const hasDetails = Boolean(entry.snapshot);

  return (
    <View
      style={[
        styles.sessionCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border + "70",
        },
      ]}
    >
      <TouchableOpacity
        style={styles.sessionCardHeader}
        activeOpacity={0.8}
        onPress={() => setExpanded((value) => !value)}
      >
        <View style={styles.sessionHeaderLeft}>
          <ScoreRing score={entry.score} total={entry.total} size={56} />
          <View style={styles.sessionHeaderText}>
            <Text style={[styles.sessionDate, { color: colors.textPrimary }]}>
              {formatSessionDateLong(entry.date)}
            </Text>
            <Text
              style={[styles.sessionMeta, { color: colors.textTertiary }]}
            >
              {entry.score}/{entry.total} correct · {pct}% accuracy
            </Text>
          </View>
        </View>

        {expanded ? (
          <ChevronUp size={18} color={colors.textTertiary} strokeWidth={2} />
        ) : (
          <ChevronDown size={18} color={colors.textTertiary} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View
          style={[
            styles.sessionExpanded,
            { borderTopColor: colors.border + "70" },
          ]}
        >
          {hasDetails ? (
            <View>
              {entry.snapshot!.questionIds.map((questionId, index) => (
                <HistoricalQuestionItem
                  key={`${entry.date}-${questionId}-${index}`}
                  snapshot={entry.snapshot!}
                  index={index}
                  colors={colors}
                />
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.legacyNotice,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <CircleAlert
                size={16}
                color={colors.textTertiary}
                strokeWidth={2.2}
              />
              <Text
                style={[styles.legacyNoticeText, { color: colors.textSecondary }]}
              >
                Detailed answers are only available for sessions completed after
                this history feature was added.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function SessionHistoryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchStats = async () => {
        setLoading(true);
        const nextStats = await loadStats();
        if (isActive) {
          setStats(nextStats);
          setLoading(false);
        }
      };

      fetchStats();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const entries = useMemo<HistoricalEntry[]>(() => {
    if (!stats) return [];

    return Object.entries(stats.history)
      .map(([date, summary]) => ({
        date,
        score: summary.score,
        total: summary.total,
        snapshot: stats.sessionHistory?.[date],
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [stats]);

  if (loading || !stats) {
    return (
      <ScreenContainer
        edges={["top", "left", "right"]}
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scrollable
      edges={["top", "left", "right"]}
      style={styles.screenContent}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={20} color={colors.textTertiary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Session History
        </Text>
        <View style={styles.closeButtonPlaceholder} />
      </View>

      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border + "60",
          },
        ]}
      >
        <View
          style={[
            styles.heroIconWrap,
            { backgroundColor: colors.primary + "12" },
          ]}
        >
          <History size={20} color={colors.primary} strokeWidth={2.2} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          Every daily session, in one place
        </Text>
        <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
          Open any past quiz to review the score and, when available, the exact
          answers you gave.
        </Text>
      </View>

      {entries.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No history yet
          </Text>
          <Text style={[styles.emptyBody, { color: colors.textTertiary }]}>
            Finish a daily session and it will show up here automatically.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => (
            <SessionCard key={entry.date} entry={entry} colors={colors} />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonPlaceholder: {
    width: 28,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  heroCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    ...Shadow.card,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  heroBody: {
    fontSize: FontSize.base,
    lineHeight: LineHeight.normal,
  },
  list: {
    gap: Spacing.md,
  },
  sessionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.base,
    ...Shadow.card,
  },
  sessionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  sessionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  sessionHeaderText: {
    flex: 1,
  },
  sessionDate: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  sessionMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  sessionExpanded: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legacyNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  legacyNoticeText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.normal,
  },
  questionItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  questionPrompt: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.tight,
  },
  questionBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginLeft: 32,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  questionExpanded: {
    marginTop: Spacing.sm,
    marginLeft: 32,
    gap: Spacing.sm,
  },
  answerCard: {
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderLeftWidth: 2,
  },
  answerLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  answerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  explanation: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.normal,
  },
  emptyCard: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    ...Shadow.card,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  emptyBody: {
    fontSize: FontSize.sm,
    textAlign: "center",
    lineHeight: LineHeight.normal,
  },
});
