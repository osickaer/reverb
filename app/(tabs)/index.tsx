import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import {
  ArrowRight,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react-native";
import {
  DailySession,
  UserStats,
  initDailySessionIfNeeded,
  loadStats,
} from "../../utils/storage";
import { seedQuestions } from "../../data/questions";
import { getThemeForDomain } from "../../constants/domain-themes";
import {
  Colors,
  CommonStyles,
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "../../constants/theme";
import { ScreenContainer } from "@/components/screen-container";
import { ScoreRing } from "@/components/score-ring";

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

/** Returns a YYYY-MM-DD string for a date offset by `daysAgo` from today (real clock). */
function offsetDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

/** Calculate the current streak from a history record (keyed by YYYY-MM-DD). */
function calcStreak(history: Record<string, unknown>, todayCompleted: boolean): number {
  let streak = 0;
  // Start checking from today backwards
  for (let i = 0; i < 365; i++) {
    const dateStr = offsetDateString(i);
    // Today: count only if session is completed
    if (i === 0) {
      if (todayCompleted) streak += 1;
      else break; // No session today yet — streak is 0
    } else {
      if (history[dateStr]) streak += 1;
      else break;
    }
  }
  return streak;
}

// ─── Session preview labels ─────────────────────────────────────────────────

const typeLabels: Record<string, { label: string; Icon: typeof Sparkles; color: string }> = {
  new: { label: "new", Icon: Sparkles, color: Colors.primary },
  missed: { label: "missed", Icon: Target, color: Colors.incorrect },
  resurfaced: { label: "review", Icon: RotateCcw, color: Colors.correct },
};

function SessionPreviewChips({ session }: { session: DailySession }) {
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
          <View key={type} style={[chipStyles.chip, { backgroundColor: conf.color + "12" }]}>
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
}: {
  domain: string;
  correct: number;
  total: number;
}) {
  const theme = getThemeForDomain(domain);
  const DomainIcon = theme.icon;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <View style={domainStyles.card}>
      <View style={[domainStyles.iconWrap, { backgroundColor: theme.tint }]}>
        <DomainIcon size={16} color={theme.accent} strokeWidth={2} />
      </View>
      <View style={domainStyles.info}>
        <View style={domainStyles.titleRow}>
          <Text style={domainStyles.name}>{domain}</Text>
          <Text style={[domainStyles.pct, { color: theme.accent }]}>{pct}%</Text>
        </View>
        <View style={domainStyles.barTrack}>
          <View
            style={[
              domainStyles.barFill,
              { width: `${Math.max(pct, 4)}%`, backgroundColor: theme.accent },
            ]}
          />
        </View>
        <Text style={domainStyles.detail}>
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
    color: Colors.textPrimary,
  },
  pct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.divider,
    marginTop: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  detail: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 3,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const [session, setSession] = useState<DailySession | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const fetch = async () => {
        setLoading(true);
        const [s, st] = await Promise.all([
          initDailySessionIfNeeded(),
          loadStats(),
        ]);
        if (active) {
          setSession(s);
          setStats(st);
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
    const totalSessions = Object.keys(stats.history || {}).length;
    const correctCount = (stats.correctQuestions || []).length;
    const missedCount = (stats.missedQuestions || []).length;
    const totalUnique = correctCount + missedCount;
    const overallAcc = totalUnique > 0 ? Math.round((correctCount / totalUnique) * 100) : 0;

    // Build domain stats
    const domainMap: Record<string, { correct: number; total: number }> = {};
    const processList = (ids: string[], isCorrect: boolean) => {
      for (const id of ids) {
        const q = seedQuestions.find((s) => s.id === id);
        if (!q) continue;
        if (!domainMap[q.domain]) domainMap[q.domain] = { correct: 0, total: 0 };
        domainMap[q.domain].total += 1;
        if (isCorrect) domainMap[q.domain].correct += 1;
      }
    };
    processList(stats.correctQuestions || [], true);
    processList(stats.missedQuestions || [], false);

    const domains = Object.entries(domainMap)
      .map(([domain, d]) => ({ domain, ...d }))
      .sort((a, b) => b.total - a.total);

    // Streak history
    const todayCompleted = session?.status === "completed";
    const streak = calcStreak(stats.history || {}, todayCompleted);

    return { totalSessions, overallAcc, totalUnique, missedCount, domains, streak };
  }, [stats, session]);

  if (loading || !session || !stats || !derivedStats) {
    return (
      <ScreenContainer style={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </ScreenContainer>
    );
  }

  const { totalSessions, overallAcc, totalUnique, missedCount, domains, streak } = derivedStats;
  const isCompleted = session.status === "completed";
  const isInProgress = session.status === "in-progress";

  // Missed IDs for retry (only when completed)
  const missedIds = isCompleted
    ? session.questionIds.filter((_, i) => session.results?.[i] === "incorrect")
    : [];

  return (
    <ScreenContainer scrollable style={styles.content}>
      {/* ── Streak Header ── */}
      <View style={styles.greetingSection}>
        {/* Top row: greeting + streak flame */}
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>{getGreeting()} 👋</Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={styles.streakCount}>{streak}</Text>
          </View>
        </View>

        {streak === 0 && (
          <Text style={styles.streakHint}>Complete today's session to start your streak!</Text>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          TODAY'S SESSION — state-aware card
          ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>TODAY</Text>

        {/* ── Available ── */}
        {session.status === "available" && (
          <View style={styles.todayInner}>
            <Text style={styles.todayTitle}>Today's 5</Text>
            <Text style={styles.todayDesc}>
              Ready to stretch your knowledge? Your daily session is waiting.
            </Text>
            <SessionPreviewChips session={session} />
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => router.push("/quiz")}
            >
              <Play size={16} color={Colors.textInverse} strokeWidth={2.5} fill={Colors.textInverse} />
              <Text style={styles.primaryButtonText}>Start Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── In-progress ── */}
        {isInProgress && (
          <View style={styles.todayInner}>
            <Text style={styles.todayTitle}>Session In Progress</Text>
            <Text style={styles.todayDesc}>
              You're on question {Math.min(session.currentIndex + 1, session.questionIds.length)} of{" "}
              {session.questionIds.length}. Pick up where you left off.
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
                      result === "correct" && { backgroundColor: Colors.correct },
                      result === "incorrect" && { backgroundColor: Colors.incorrect },
                      !result && i === session.currentIndex && {
                        backgroundColor: Colors.primary,
                        transform: [{ scale: 1.2 }],
                      },
                    ]}
                  />
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => router.push("/quiz")}
            >
              <ArrowRight size={16} color={Colors.textInverse} strokeWidth={2.5} />
              <Text style={styles.primaryButtonText}>Resume Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Completed ── */}
        {isCompleted && (
          <View style={styles.todayInner}>
            <ScoreRing score={session.score} total={session.questionIds.length} size={100} strokeWidth={10} />
            <Text style={styles.todayTagline}>
              {getTagline(session.score, session.questionIds.length)}
            </Text>

            <View style={styles.completedButtons}>
              <TouchableOpacity
                style={styles.outlinedButton}
                activeOpacity={0.8}
                onPress={() => router.push("/session-summary")}
              >
                <Text style={styles.outlinedButtonText}>Review Full Session</Text>
              </TouchableOpacity>

              {missedIds.length > 0 && (
                <TouchableOpacity
                  style={[styles.outlinedButton, { borderColor: Colors.incorrect + "30", backgroundColor: Colors.incorrect + "08" }]}
                  activeOpacity={0.8}
                  onPress={() => router.push("/session-summary")}
                >
                  <RefreshCw size={14} color={Colors.incorrect} strokeWidth={2.5} />
                  <Text style={[styles.outlinedButtonText, { color: Colors.incorrect }]}>
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
      {domains.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>DOMAIN MASTERY</Text>
          {domains.map((d) => (
            <DomainMiniCard key={d.domain} domain={d.domain} correct={d.correct} total={d.total} />
          ))}
        </View>
      )}

      {/* ── Weak spots ── */}
      {missedCount > 0 && (
        <View style={styles.weakCard}>
          <View style={styles.weakHeader}>
            <Zap size={16} color={Colors.warning} strokeWidth={2.5} />
            <Text style={styles.weakTitle}>Weak Spots</Text>
          </View>
          <Text style={styles.weakBody}>
            You have {missedCount} identified weak-spot{" "}
            {missedCount === 1 ? "question" : "questions"}. Reverb automatically resurfaces these
            in future sessions to build retention.
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
    color: Colors.textPrimary,
    flex: 1,
  },

  /* ── Streak header ── */
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.warning + "15",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.warning + "30",
  },
  streakFlame: {
    fontSize: FontSize.md,
  },
  streakCount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.warning,
  },
  streakHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: Spacing.md,
    fontStyle: "italic",
  },

  /* ── Section card ── */
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border + "60",
    ...Shadow.card,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
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
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  todayDesc: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: LineHeight.relaxed,
  },
  todayTagline: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: "center",
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
    backgroundColor: Colors.border,
  },

  /* ── Buttons ── */
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
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
    color: Colors.textInverse,
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
    borderColor: Colors.primary + "30",
    backgroundColor: Colors.primary + "08",
    gap: Spacing.sm,
  },
  outlinedButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  /* ── Weak spots ── */
  weakCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
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
    color: Colors.textPrimary,
  },
  weakBody: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: LineHeight.relaxed,
  },
});
