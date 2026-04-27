import { ScoreRing } from "@/components/score-ring";
import { ScreenContainer } from "@/components/screen-container";
import { useAppTheme, useThemeColors } from "@/contexts/theme-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowRight,
  Monitor,
  Moon,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Sun,
  Target,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDomainTheme } from "../../constants/domain-themes";
import {
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "../../constants/theme";
import { fetchQuestions } from "../../data/questions";
import { Question } from "../../data/questions-interface";
import {
  calculateCurrentStreak,
  DailySession,
  initDailySessionIfNeeded,
  loadFreeplaySession,
  loadStats,
  startFreeplaySession,
  UserStats,
} from "../../utils/storage";
import { syncDailySessionReminder } from "../../utils/notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTagline(score: number, total: number): string {
  const pct = total > 0 ? score / total : 0;
  if (pct === 1) return "Perfect session! 🔥";
  if (pct >= 0.8) return "You're on fire! Great job.";
  if (pct >= 0.6) return "Solid work — keep building!";
  if (pct >= 0.4) return "Getting sharper every day.";
  return "Every session makes you stronger.";
}

// ─── Session preview labels ─────────────────────────────────────────────────

function SessionPreviewChips({
  session,
  colors,
}: {
  session: DailySession;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const typeLabels: Record<
    string,
    { label: string; Icon: typeof Sparkles; color: string }
  > = {
    new: { label: "new", Icon: Sparkles, color: colors.primary },
    missed: { label: "missed", Icon: Target, color: colors.incorrect },
    resurfaced: { label: "review", Icon: RotateCcw, color: colors.correct },
  };

  const counts: Record<string, number> = {};
  if (session.questionTypes) {
    for (const type of Object.values(session.questionTypes)) {
      counts[type] = (counts[type] || 0) + 1;
    }
  }

  const chips = Object.entries(counts).filter(([t]) => typeLabels[t]);
  if (chips.length === 0) return null;

  return (
    <View style={chipStyles.row}>
      {chips.map(([type, count]) => {
        const conf = typeLabels[type];
        const IconComp = conf.Icon;
        return (
          <View
            key={type}
            style={[chipStyles.chip, { backgroundColor: conf.color + "12" }]}
          >
            <IconComp size={12} color={conf.color} strokeWidth={2.5} />
            <Text style={[chipStyles.chipText, { color: conf.color }]}>
              {count} {conf.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});

// ─── Compact domain mastery card ────────────────────────────────────────────

function DomainMiniCard({
  domain,
  correct,
  total,
  colors,
}: {
  domain: string;
  correct: number;
  total: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const theme = useDomainTheme(domain);
  const DomainIcon = theme.icon;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <View style={domainStyles.card}>
      <View style={[domainStyles.iconWrap, { backgroundColor: theme.tint }]}>
        <DomainIcon size={16} color={theme.accent} strokeWidth={2} />
      </View>
      <View style={domainStyles.info}>
        <View style={domainStyles.titleRow}>
          <Text style={[domainStyles.name, { color: colors.textPrimary }]}>
            {domain}
          </Text>
          <Text style={[domainStyles.pct, { color: theme.accent }]}>
            {pct}%
          </Text>
        </View>
        <View
          style={[domainStyles.barTrack, { backgroundColor: colors.divider }]}
        >
          <View
            style={[
              domainStyles.barFill,
              { width: `${Math.max(pct, 4)}%`, backgroundColor: theme.accent },
            ]}
          />
        </View>
        <Text style={[domainStyles.detail, { color: colors.textTertiary }]}>
          {correct}/{total} correct
        </Text>
      </View>
    </View>
  );
}

const domainStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  pct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  detail: {
    fontSize: FontSize.xs,
    marginTop: 3,
  },
});

// ─── Theme Toggle Button ────────────────────────────────────────────────────

function ThemeToggle() {
  const { preference, cycleTheme, colors } = useAppTheme();

  const icon =
    preference === "dark" ? Moon : preference === "light" ? Sun : Monitor;

  const IconComp = icon;
  const label =
    preference === "dark" ? "Dark" : preference === "light" ? "Light" : "Auto";

  return (
    <TouchableOpacity
      style={[
        themeToggleStyles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border + "60",
        },
      ]}
      activeOpacity={0.7}
      onPress={cycleTheme}
    >
      <IconComp size={14} color={colors.textTertiary} strokeWidth={2} />
      <Text style={[themeToggleStyles.label, { color: colors.textTertiary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const themeToggleStyles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [session, setSession] = useState<DailySession | null>(null);
  const [freeplaySession, setFreeplaySession] = useState<DailySession | null>(
    null,
  );
  const [stats, setStats] = useState<UserStats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const fetch = async () => {
        setLoading(true);
        const [s, freeplay, st, loadedQuestions] = await Promise.all([
          initDailySessionIfNeeded(),
          loadFreeplaySession(),
          loadStats(),
          fetchQuestions(),
        ]);
        await syncDailySessionReminder({
          dateKey: s.date,
          isCompleted: s.status === "completed",
        });
        if (active) {
          setSession(s);
          setFreeplaySession(freeplay);
          setStats(st);
          setQuestions(loadedQuestions);
          setLoading(false);
        }
      };
      fetch();
      return () => {
        active = false;
      };
    }, []),
  );

  // Derived stats
  const derivedStats = useMemo(() => {
    if (!stats || !session) return null;
    const missedCount = (stats.missedQuestions || []).length;
    const questionsById = new Map(
      questions.map((question) => [question.id, question]),
    );

    // Build domain stats
    const domainMap: Record<string, { correct: number; total: number }> = {};
    const processList = (ids: string[], isCorrect: boolean) => {
      for (const id of ids) {
        const q = questionsById.get(id);
        if (!q) continue;
        if (!domainMap[q.domain])
          domainMap[q.domain] = { correct: 0, total: 0 };
        domainMap[q.domain].total += 1;
        if (isCorrect) domainMap[q.domain].correct += 1;
      }
    };
    processList(stats.correctQuestions || [], true);
    processList(stats.missedQuestions || [], false);

    const domains = Object.entries(domainMap)
      .map(([domain, d]) => ({ domain, ...d }))
      .sort((a, b) => b.total - a.total);

    const streak = calculateCurrentStreak(stats.history || {});

    return { missedCount, domains, streak };
  }, [questions, stats, session]);

  if (loading || !session || !stats || !derivedStats) {
    return (
      <ScreenContainer
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const { missedCount, domains, streak } = derivedStats;
  const isCompleted = session.status === "completed";
  const isInProgress = session.status === "in-progress";

  // Missed IDs for retry (only when completed)
  const missedIds = isCompleted
    ? session.questionIds.filter((_, i) => session.results?.[i] === "incorrect")
    : [];
  const freeplayAnsweredCount =
    freeplaySession?.results?.filter((result) => result !== null).length ?? 0;

  const handleStartFreeplay = async () => {
    const nextFreeplaySession = await startFreeplaySession();
    setFreeplaySession(nextFreeplaySession);
    router.push("/quiz?mode=freeplay");
  };

  return (
    <ScreenContainer scrollable style={styles.content}>
      {/* ── Streak Header ── */}
      <View style={styles.greetingSection}>
        {/* Top row: greeting + theme toggle + streak flame */}
        <View style={styles.greetingRow}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {getGreeting()} 👋
          </Text>
          <View style={styles.headerActions}>
            <ThemeToggle />
            <View
              style={[
                styles.streakBadge,
                {
                  backgroundColor: colors.warning + "15",
                  borderColor: colors.warning + "30",
                },
              ]}
            >
              <Text style={styles.streakFlame}>🔥</Text>
              <Text style={[styles.streakCount, { color: colors.warning }]}>
                {streak}
              </Text>
            </View>
          </View>
        </View>

        {streak === 0 && (
          <Text style={[styles.streakHint, { color: colors.textTertiary }]}>
            Complete today&apos;s session to start your streak!
          </Text>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          TODAY'S SESSION — state-aware card
          ══════════════════════════════════════════════════════════════════════ */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border + "60",
          },
        ]}
      >
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          TODAY
        </Text>

        {/* ── Available ── */}
        {session.status === "available" && (
          <View style={styles.todayInner}>
            <Text style={[styles.todayTitle, { color: colors.textPrimary }]}>
              Today&apos;s 5
            </Text>
            <Text style={[styles.todayDesc, { color: colors.textSecondary }]}>
              Ready to stretch your knowledge? Your daily session is waiting.
            </Text>
            <SessionPreviewChips session={session} colors={colors} />
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              activeOpacity={0.8}
              onPress={() => router.push("/quiz")}
            >
              <Play
                size={16}
                color={colors.textInverse}
                strokeWidth={2.5}
                fill={colors.textInverse}
              />
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: colors.textInverse },
                ]}
              >
                Start Session
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── In-progress ── */}
        {isInProgress && (
          <View style={styles.todayInner}>
            <Text style={[styles.todayTitle, { color: colors.textPrimary }]}>
              Session In Progress
            </Text>
            <Text style={[styles.todayDesc, { color: colors.textSecondary }]}>
              You&apos;re on question{" "}
              {Math.min(session.currentIndex + 1, session.questionIds.length)}{" "}
              of {session.questionIds.length}. Pick up where you left off.
            </Text>

            {/* Mini progress bar */}
            <View style={styles.miniProgressRow}>
              {session.questionIds.map((_, i) => {
                const result = session.results?.[i];
                return (
                  <View
                    key={i}
                    style={[
                      styles.miniProgressDot,
                      { backgroundColor: colors.border },
                      result === "correct" && {
                        backgroundColor: colors.correct,
                      },
                      result === "incorrect" && {
                        backgroundColor: colors.incorrect,
                      },
                      !result &&
                        i === session.currentIndex && {
                          backgroundColor: colors.primary,
                          transform: [{ scale: 1.2 }],
                        },
                    ]}
                  />
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              activeOpacity={0.8}
              onPress={() => router.push("/quiz")}
            >
              <ArrowRight
                size={16}
                color={colors.textInverse}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: colors.textInverse },
                ]}
              >
                Resume Session
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Completed ── */}
        {isCompleted && (
          <View style={styles.todayInner}>
            <ScoreRing
              score={session.score}
              total={session.questionIds.length}
              size={100}
              strokeWidth={10}
            />
            <Text
              style={[styles.todayTagline, { color: colors.textSecondary }]}
            >
              {getTagline(session.score, session.questionIds.length)}
            </Text>

            <View style={styles.completedButtons}>
              <TouchableOpacity
                style={[
                  styles.outlinedButton,
                  {
                    borderColor: colors.primary + "30",
                    backgroundColor: colors.primary + "08",
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => router.push("/session-summary")}
              >
                <Text
                  style={[styles.outlinedButtonText, { color: colors.primary }]}
                >
                  Review Full Session
                </Text>
              </TouchableOpacity>

              {missedIds.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.outlinedButton,
                    {
                      borderColor: colors.incorrect + "30",
                      backgroundColor: colors.incorrect + "08",
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => router.push("/session-summary")}
                >
                  <RefreshCw
                    size={14}
                    color={colors.incorrect}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      styles.outlinedButtonText,
                      { color: colors.incorrect },
                    ]}
                  >
                    Retry Missed ({missedIds.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          DOMAIN MASTERY
          ══════════════════════════════════════════════════════════════════════ */}
      <View
        style={[
          styles.practiceCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border + "60",
          },
        ]}
      >
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          FREEPLAY
        </Text>
        <Text style={[styles.practiceTitle, { color: colors.textPrimary }]}>
          Endless practice mode
        </Text>
        <Text style={[styles.practiceBody, { color: colors.textSecondary }]}>
          Shuffle through the full question bank as long as you want. Freeplay
          answers never affect your saved streak, history, or weak-spot stats.
        </Text>
        <Text style={[styles.practiceMeta, { color: colors.textTertiary }]}>
          {freeplaySession
            ? `${freeplayAnsweredCount} question${freeplayAnsweredCount === 1 ? "" : "s"} answered in your current run.`
            : `Freshly shuffled from all ${questions.length} questions.`}
        </Text>

        <View style={styles.practiceButtons}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary, marginTop: 0 },
            ]}
            activeOpacity={0.8}
            onPress={() =>
              freeplaySession
                ? router.push("/quiz?mode=freeplay")
                : handleStartFreeplay()
            }
          >
            <Play
              size={16}
              color={colors.textInverse}
              strokeWidth={2.5}
              fill={colors.textInverse}
            />
            <Text
              style={[styles.primaryButtonText, { color: colors.textInverse }]}
            >
              {freeplaySession ? "Resume Freeplay" : "Start Freeplay"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.outlinedButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            activeOpacity={0.8}
            onPress={handleStartFreeplay}
          >
            <RefreshCw
              size={14}
              color={colors.textSecondary}
              strokeWidth={2.5}
            />
            <Text
              style={[
                styles.outlinedButtonText,
                { color: colors.textSecondary },
              ]}
            >
              {freeplaySession ? "Restart Shuffle" : "Shuffle Again"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {domains.length > 0 && (
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border + "60",
            },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            DOMAIN MASTERY
          </Text>
          {domains.map((d) => (
            <DomainMiniCard
              key={d.domain}
              domain={d.domain}
              correct={d.correct}
              total={d.total}
              colors={colors}
            />
          ))}
        </View>
      )}

      {/* ── Weak spots ── */}
      {missedCount > 0 && (
        <View
          style={[
            styles.weakCard,
            {
              backgroundColor: colors.surface,
              borderLeftColor: colors.warning,
            },
          ]}
        >
          <View style={styles.weakHeader}>
            <Zap size={16} color={colors.warning} strokeWidth={2.5} />
            <Text style={[styles.weakTitle, { color: colors.textPrimary }]}>
              Weak Spots
            </Text>
          </View>
          <Text style={[styles.weakBody, { color: colors.textSecondary }]}>
            You have {missedCount} identified weak-spot{" "}
            {missedCount === 1 ? "question" : "questions"}. Reverb automatically
            resurfaces these in future sessions to build retention.
          </Text>
        </View>
      )}

      {/* Bottom spacer */}
      <View style={{ height: Spacing.xxl }} />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },

  /* ── Greeting ── */
  greetingSection: {
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    flex: 1,
  },

  /* ── Streak header ── */
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  streakFlame: {
    fontSize: FontSize.md,
  },
  streakCount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  streakHint: {
    fontSize: FontSize.xs,
    textAlign: "center",
    marginTop: Spacing.md,
    fontStyle: "italic",
  },

  /* ── Section card ── */
  sectionCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    ...Shadow.card,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },

  /* ── Today card inners ── */
  todayInner: {
    alignItems: "center",
  },
  todayTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  todayDesc: {
    fontSize: FontSize.base,
    textAlign: "center",
    lineHeight: LineHeight.relaxed,
  },
  todayTagline: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  practiceCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    ...Shadow.card,
  },
  practiceTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  practiceBody: {
    fontSize: FontSize.base,
    lineHeight: LineHeight.relaxed,
  },
  practiceMeta: {
    fontSize: FontSize.xs,
    marginTop: Spacing.md,
  },
  practiceButtons: {
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },

  /* ── Progress dots (in-progress state) ── */
  miniProgressRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  miniProgressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  /* ── Buttons ── */
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: "100%",
    ...Shadow.card,
  },
  primaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  completedButtons: {
    width: "100%",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  outlinedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.base,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  outlinedButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  /* ── Weak spots ── */
  weakCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderLeftWidth: 3,
    ...Shadow.card,
  },
  weakHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  weakTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  weakBody: {
    fontSize: FontSize.base,
    lineHeight: LineHeight.relaxed,
  },
});
