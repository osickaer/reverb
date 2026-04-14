import { ScreenContainer } from "@/components/screen-container";
import { getThemeForDomain } from "@/constants/domain-themes";
import { useThemeColors } from "@/contexts/theme-context";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronDown, ChevronRight, History } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "../../constants/theme";
import { seedQuestions } from "../../data/questions";
import {
  calculateCurrentStreak,
  getDateStringForOffset,
  loadStats,
  UserStats,
} from "../../utils/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubdomainStat {
  subdomain: string;
  correct: number;
  total: number;
}

interface DomainStat {
  domain: string;
  correct: number;
  total: number;
  subdomains: SubdomainStat[];
}

interface StreakChartDay {
  date: string;
  score: number;
  total: number;
  label: string;
  isToday: boolean;
  completed: boolean;
  pct: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDomainStats(stats: UserStats): DomainStat[] {
  const domainMap: Record<
    string,
    {
      correct: number;
      total: number;
      subMap: Record<string, { correct: number; total: number }>;
    }
  > = {};

  const process = (ids: string[], isCorrect: boolean) => {
    for (const id of ids) {
      const q = seedQuestions.find((s) => s.id === id);
      if (!q) continue;

      if (!domainMap[q.domain]) {
        domainMap[q.domain] = { correct: 0, total: 0, subMap: {} };
      }
      domainMap[q.domain].total += 1;
      if (isCorrect) domainMap[q.domain].correct += 1;

      const sub = q.subdomain ?? "General";
      if (!domainMap[q.domain].subMap[sub]) {
        domainMap[q.domain].subMap[sub] = { correct: 0, total: 0 };
      }
      domainMap[q.domain].subMap[sub].total += 1;
      if (isCorrect) domainMap[q.domain].subMap[sub].correct += 1;
    }
  };

  process(stats.correctQuestions ?? [], true);
  process(stats.missedQuestions ?? [], false);

  return Object.entries(domainMap)
    .map(([domain, data]) => ({
      domain,
      correct: data.correct,
      total: data.total,
      subdomains: Object.entries(data.subMap)
        .map(([subdomain, s]) => ({ subdomain, ...s }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => {
      const accDiff = b.correct / b.total - a.correct / a.total;
      return accDiff !== 0 ? accDiff : b.total - a.total;
    });
}

function accuracy(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

function offsetDate(daysAgo: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function buildRecentChartData(
  history: UserStats["history"],
  days: number = 14,
): StreakChartDay[] {
  return Array.from({ length: days }, (_, index) => {
    const daysAgo = days - index - 1;
    const date = offsetDate(daysAgo);
    const key = getDateStringForOffset(daysAgo);
    const dayStat = history[key];
    const completed = Boolean(dayStat);
    const score = dayStat?.score ?? 0;
    const total = dayStat?.total ?? 5;

    return {
      date: key,
      score,
      total,
      label: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      isToday: daysAgo === 0,
      completed,
      pct: completed ? Math.round((score / total) * 100) : 0,
    };
  });
}

function formatChartDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccuracyBar({
  pct,
  accent,
  colors,
}: {
  pct: number;
  accent: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[barStyles.track, { backgroundColor: colors.divider }]}>
      <View
        style={[
          barStyles.fill,
          { width: `${pct}%` as any, backgroundColor: accent },
        ]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
});

function ProgressStreakChart({
  history,
  colors,
}: {
  history: UserStats["history"];
  colors: ReturnType<typeof useThemeColors>;
}) {
  const router = useRouter();
  const chartData = useMemo(() => buildRecentChartData(history), [history]);
  const streak = useMemo(() => calculateCurrentStreak(history), [history]);
  const completedDays = chartData.filter((day) => day.completed);
  const lastCompletedDay = completedDays[completedDays.length - 1];
  const fallbackDay = chartData[chartData.length - 1];
  const [selectedDate, setSelectedDate] = useState<string | null>(
    lastCompletedDay?.date ?? fallbackDay?.date ?? null,
  );

  useEffect(() => {
    setSelectedDate(lastCompletedDay?.date ?? fallbackDay?.date ?? null);
  }, [lastCompletedDay?.date, fallbackDay?.date]);

  const selectedDay =
    chartData.find((day) => day.date === selectedDate) ?? fallbackDay;

  if (Object.keys(history).length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          Complete a few daily sessions to see your streak and score trend.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
            Daily Streak
          </Text>
          <Text style={[styles.chartSubtitle, { color: colors.textTertiary }]}>
            Last 14 days
          </Text>
        </View>
        <View style={styles.chartHeaderActions}>
          <TouchableOpacity
            style={[
              styles.historyButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => router.push("/session-history")}
          >
            <History size={14} color={colors.textSecondary} strokeWidth={2.2} />
            <Text
              style={[
                styles.historyButtonText,
                { color: colors.textSecondary },
              ]}
            >
              View History
            </Text>
          </TouchableOpacity>
          <View
            style={[
              styles.chartStreakBadge,
              {
                backgroundColor: colors.warning + "15",
                borderColor: colors.warning + "30",
              },
            ]}
          >
            <Text style={styles.chartStreakFlame}>🔥</Text>
            <Text style={[styles.chartStreakCount, { color: colors.warning }]}>
              {streak}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.streakStripRow}>
        {chartData.map((day) => {
          const isSelected = selectedDay?.date === day.date;
          const containerColor = day.completed ? colors.correct : "transparent";

          return (
            <TouchableOpacity
              key={day.date}
              style={styles.streakDayButton}
              activeOpacity={0.8}
              onPress={() => setSelectedDate(day.date)}
            >
              <View
                style={[
                  styles.streakDayCell,
                  {
                    backgroundColor: containerColor,
                    borderColor: isSelected
                      ? colors.correct
                      : day.isToday
                        ? colors.textSecondary
                        : "transparent",
                  },
                ]}
              >
                <View
                  style={[
                    styles.streakDayFill,
                    {
                      backgroundColor: colors.correct,
                      opacity: day.completed ? 1 : 0,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.chartDayLabel,
                  {
                    color:
                      isSelected || day.isToday
                        ? colors.textPrimary
                        : colors.textTertiary,
                  },
                ]}
              >
                {day.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDay && (
        <View style={[styles.chartDetail, { borderTopColor: colors.border }]}>
          <Text style={[styles.chartDetailDate, { color: colors.textPrimary }]}>
            {formatChartDate(selectedDay.date)}
          </Text>
          <Text
            style={[styles.chartDetailValue, { color: colors.textSecondary }]}
          >
            {selectedDay.completed
              ? `${selectedDay.score}/${selectedDay.total} correct`
              : "Missed day"}
          </Text>
        </View>
      )}
    </View>
  );
}

function SubdomainRow({
  sub,
  accent,
  colors,
}: {
  sub: SubdomainStat;
  accent: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const pct = accuracy(sub.correct, sub.total);
  return (
    <View style={[subStyle.row, { borderTopColor: colors.divider }]}>
      <View style={subStyle.header}>
        <Text style={[subStyle.name, { color: colors.textSecondary }]}>
          {sub.subdomain}
        </Text>
        <Text style={[subStyle.pct, { color: accent }]}>{pct}%</Text>
      </View>
      <AccuracyBar pct={pct} accent={accent} colors={colors} />
      <Text style={[subStyle.count, { color: colors.textTertiary }]}>
        {sub.correct} / {sub.total} correct
      </Text>
    </View>
  );
}

const subStyle = StyleSheet.create({
  row: {
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  pct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  count: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});

function DomainCard({
  stat,
  colors,
}: {
  stat: DomainStat;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const theme = getThemeForDomain(stat.domain);
  const DomainIcon = theme.icon;
  const pct = accuracy(stat.correct, stat.total);

  return (
    <View
      style={[
        cardStyle.card,
        { backgroundColor: colors.surface, borderLeftColor: theme.accent },
      ]}
    >
      <TouchableOpacity
        style={cardStyle.header}
        activeOpacity={0.7}
        onPress={() => setExpanded((v) => !v)}
      >
        <View style={[cardStyle.iconWrap, { backgroundColor: theme.tint }]}>
          <DomainIcon size={18} color={theme.accent} strokeWidth={2} />
        </View>
        <View style={cardStyle.titleBlock}>
          <Text style={[cardStyle.domainName, { color: colors.textPrimary }]}>
            {stat.domain}
          </Text>
          <Text style={[cardStyle.subtext, { color: colors.textTertiary }]}>
            {stat.total} {stat.total === 1 ? "question" : "questions"} tracked
          </Text>
        </View>

        <View style={cardStyle.rightCol}>
          <View style={[cardStyle.badge, { backgroundColor: theme.tint }]}>
            <Text style={[cardStyle.badgeText, { color: theme.accent }]}>
              {pct}%
            </Text>
          </View>
          {expanded ? (
            <ChevronDown size={16} color={colors.textTertiary} />
          ) : (
            <ChevronRight size={16} color={colors.textTertiary} />
          )}
        </View>
      </TouchableOpacity>

      <AccuracyBar pct={pct} accent={theme.accent} colors={colors} />

      {expanded && (
        <View style={cardStyle.subdomains}>
          {stat.subdomains.map((sub) => (
            <SubdomainRow
              key={sub.subdomain}
              sub={sub}
              accent={theme.accent}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const cardStyle = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  titleBlock: {
    flex: 1,
  },
  domainName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  subtext: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  rightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  subdomains: {
    marginTop: Spacing.sm,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProgressTabScreen() {
  const colors = useThemeColors();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchStats = async () => {
        setLoading(true);
        const userStats = await loadStats();
        if (isActive) {
          setStats(userStats);
          setLoading(false);
        }
      };
      fetchStats();
      return () => {
        isActive = false;
      };
    }, []),
  );

  if (loading || !stats) {
    return (
      <ScreenContainer
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const totalSessions = Object.keys(stats.history || {}).length;
  const correctCount = (stats.correctQuestions || []).length;
  const missedCount = (stats.missedQuestions || []).length;
  const totalUnique = correctCount + missedCount;
  const overallAcc =
    totalUnique > 0 ? Math.round((correctCount / totalUnique) * 100) : 0;

  const domainStats = buildDomainStats(stats);

  return (
    <ScreenContainer scrollable style={styles.contentContainer}>
      {/* ── Top stat cards ── */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.metricValue, { color: colors.primary }]}>
            {totalSessions}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>
            Sessions
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.metricValue, { color: colors.primary }]}>
            {overallAcc}%
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>
            Accuracy
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.metricValue, { color: colors.primary }]}>
            {totalUnique}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>
            Questions
          </Text>
        </View>
      </View>

      {/* ── Domain mastery ── */}
      <ProgressStreakChart history={stats.history || {}} colors={colors} />

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Domain Mastery
      </Text>

      {domainStats.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            Complete a session to see your domain mastery.
          </Text>
        </View>
      ) : (
        domainStats.map((d) => (
          <DomainCard key={d.domain} stat={d} colors={colors} />
        ))
      )}

      {/* ── Weak spots summary ── */}
      <View
        style={[
          styles.weakCard,
          { backgroundColor: colors.surface, borderLeftColor: colors.warning },
        ]}
      >
        <Text style={[styles.weakTitle, { color: colors.textPrimary }]}>
          ⚡ Weak Spots
        </Text>
        <Text style={[styles.weakBody, { color: colors.textSecondary }]}>
          {missedCount > 0
            ? `You have ${missedCount} identified weak-spot ${missedCount === 1 ? "question" : "questions"}. Reverb automatically resurfaces these in future sessions to build retention.`
            : "No weak spots identified yet — keep quizzing!"}
        </Text>
      </View>

      {/* ── Debug tools ── */}
      {/* <View style={[styles.debugSection, { borderTopColor: colors.border }]}>
        <Text style={[styles.debugTitle, { color: colors.textTertiary }]}>
          🛠 Debug Tools
        </Text>
        <TouchableOpacity
          style={[
            styles.debugButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
          onPress={() => debugReverbStorage()}
        >
          <Text
            style={[styles.debugButtonText, { color: colors.textSecondary }]}
          >
            Dump Session & Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.debugButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
          onPress={() => listAllStorage()}
        >
          <Text
            style={[styles.debugButtonText, { color: colors.textSecondary }]}
          >
            List All Storage
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.debugButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.incorrect + "40",
            },
          ]}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              "Clear Storage",
              "This will wipe all session and stats data. Continue?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Clear",
                  style: "destructive",
                  onPress: () => clearReverbStorage(),
                },
              ],
            )
          }
        >
          <Text style={[styles.debugButtonText, { color: colors.incorrect }]}>
            Clear Storage
          </Text>
        </TouchableOpacity>
      </View> */}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  contentContainer: {
    padding: Spacing.screen,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xxl,
  },
  metricCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flex: 1,
    marginHorizontal: Spacing.xs,
    alignItems: "center",
    ...Shadow.card,
  },
  metricValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  chartCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    ...Shadow.card,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  chartHeaderActions: {
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  chartTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  chartSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  historyButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  chartStreakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chartStreakFlame: {
    fontSize: FontSize.md,
  },
  chartStreakCount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  streakStripRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  streakDayButton: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  streakDayCell: {
    width: "100%",
    maxWidth: 22,
    height: 34,
    borderRadius: Radius.md,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  streakDayFill: {
    width: "100%",
    height: "100%",
    borderRadius: Radius.md,
  },
  chartDayLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  chartDetail: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  chartDetailDate: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  chartDetailValue: {
    fontSize: FontSize.sm,
    marginTop: 2,
    textAlign: "center",
  },
  emptyCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadow.card,
  },
  emptyText: {
    fontStyle: "italic",
    lineHeight: LineHeight.normal,
  },
  weakCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
    ...Shadow.card,
  },
  weakTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  weakBody: {
    fontSize: FontSize.base,
    lineHeight: LineHeight.normal,
  },
  debugSection: {
    marginTop: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  debugTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  debugButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
  },
  debugButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
