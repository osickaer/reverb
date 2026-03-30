import { getThemeForDomain } from "@/constants/domain-themes";
import { useFocusEffect } from "expo-router";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { seedQuestions } from "../../data/questions";
import {
  clearReverbStorage,
  debugReverbStorage,
  listAllStorage,
} from "../../utils/storage-debug";
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
import { loadStats, UserStats } from "../../utils/storage";
import { ScreenContainer } from "@/components/screen-container";

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
      const accDiff =
        b.correct / b.total - a.correct / a.total;
      return accDiff !== 0 ? accDiff : b.total - a.total;
    });
}

function accuracy(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccuracyBar({
  pct,
  accent,
}: {
  pct: number;
  accent: string;
}) {
  return (
    <View style={barStyles.track}>
      <View
        style={[barStyles.fill, { width: `${pct}%` as any, backgroundColor: accent }]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.divider,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
});

function SubdomainRow({ sub, accent }: { sub: SubdomainStat; accent: string }) {
  const pct = accuracy(sub.correct, sub.total);
  return (
    <View style={subStyle.row}>
      <View style={subStyle.header}>
        <Text style={subStyle.name}>{sub.subdomain}</Text>
        <Text style={[subStyle.pct, { color: accent }]}>{pct}%</Text>
      </View>
      <AccuracyBar pct={pct} accent={accent} />
      <Text style={subStyle.count}>
        {sub.correct} / {sub.total} correct
      </Text>
    </View>
  );
}

const subStyle = StyleSheet.create({
  row: {
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
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
    color: Colors.textSecondary,
  },
  pct: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  count: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
});

function DomainCard({ stat }: { stat: DomainStat }) {
  const [expanded, setExpanded] = useState(false);
  const theme = getThemeForDomain(stat.domain);
  const DomainIcon = theme.icon;
  const pct = accuracy(stat.correct, stat.total);

  return (
    <View style={[cardStyle.card, { borderLeftColor: theme.accent }]}>
      {/* ── Header row (always visible) ── */}
      <TouchableOpacity
        style={cardStyle.header}
        activeOpacity={0.7}
        onPress={() => setExpanded((v) => !v)}
      >
        {/* Icon + domain name */}
        <View style={[cardStyle.iconWrap, { backgroundColor: theme.tint }]}>
          <DomainIcon size={18} color={theme.accent} strokeWidth={2} />
        </View>
        <View style={cardStyle.titleBlock}>
          <Text style={cardStyle.domainName}>{stat.domain}</Text>
          <Text style={cardStyle.subtext}>
            {stat.total} {stat.total === 1 ? "question" : "questions"} tracked
          </Text>
        </View>

        {/* Accuracy badge + chevron */}
        <View style={cardStyle.rightCol}>
          <View
            style={[cardStyle.badge, { backgroundColor: theme.tint }]}
          >
            <Text style={[cardStyle.badgeText, { color: theme.accent }]}>
              {pct}%
            </Text>
          </View>
          {expanded ? (
            <ChevronDown size={16} color={Colors.textTertiary} />
          ) : (
            <ChevronRight size={16} color={Colors.textTertiary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Overall accuracy bar */}
      <AccuracyBar pct={pct} accent={theme.accent} />

      {/* ── Expanded subdomain list ── */}
      {expanded && (
        <View style={cardStyle.subdomains}>
          {stat.subdomains.map((sub) => (
            <SubdomainRow
              key={sub.subdomain}
              sub={sub}
              accent={theme.accent}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const cardStyle = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
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
    color: Colors.textPrimary,
  },
  subtext: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
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
      <ScreenContainer style={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{totalSessions}</Text>
          <Text style={styles.metricLabel}>Sessions</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{overallAcc}%</Text>
          <Text style={styles.metricLabel}>Accuracy</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{totalUnique}</Text>
          <Text style={styles.metricLabel}>Questions</Text>
        </View>
      </View>

      {/* ── Domain mastery ── */}
      <Text style={styles.sectionTitle}>Domain Mastery</Text>

      {domainStats.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Complete a session to see your domain mastery.
          </Text>
        </View>
      ) : (
        domainStats.map((d) => <DomainCard key={d.domain} stat={d} />)
      )}

      {/* ── Weak spots summary ── */}
      <View style={styles.weakCard}>
        <Text style={styles.weakTitle}>⚡ Weak Spots</Text>
        <Text style={styles.weakBody}>
          {missedCount > 0
            ? `You have ${missedCount} identified weak-spot ${missedCount === 1 ? "question" : "questions"}. Reverb automatically resurfaces these in future sessions to build retention.`
            : "No weak spots identified yet — keep quizzing!"}
        </Text>
      </View>

      {/* ── Debug tools ── */}
      <View style={styles.debugSection}>
        <Text style={styles.debugTitle}>🛠 Debug Tools</Text>
        <TouchableOpacity
          style={styles.debugButton}
          activeOpacity={0.7}
          onPress={() => debugReverbStorage()}
        >
          <Text style={styles.debugButtonText}>Dump Session & Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.debugButton}
          activeOpacity={0.7}
          onPress={() => listAllStorage()}
        >
          <Text style={styles.debugButtonText}>List All Storage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.debugButton, styles.debugButtonDanger]}
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
          <Text style={[styles.debugButtonText, styles.debugButtonDangerText]}>
            Clear Storage
          </Text>
        </TouchableOpacity>
      </View>
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
    ...CommonStyles.card,
    flex: 1,
    marginHorizontal: Spacing.xs,
    alignItems: "center",
  },
  metricValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    ...CommonStyles.labelText,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    ...CommonStyles.card,
    marginBottom: Spacing.xl,
  },
  emptyText: {
    color: Colors.textTertiary,
    fontStyle: "italic",
    lineHeight: LineHeight.normal,
  },
  weakCard: {
    ...CommonStyles.card,
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  weakTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  weakBody: {
    ...CommonStyles.bodyText,
    lineHeight: LineHeight.normal,
  },
  debugSection: {
    marginTop: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  debugTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  debugButton: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  debugButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  debugButtonDanger: {
    borderColor: Colors.incorrect + "40",
  },
  debugButtonDangerText: {
    color: Colors.incorrect,
  },
});
