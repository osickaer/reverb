import { FriendManagementModal } from "@/components/friend-management-modal";
import { ScreenContainer } from "@/components/screen-container";
import { useDomainTheme } from "@/constants/domain-themes";
import {
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { useThemeColors } from "@/contexts/theme-context";
import { fetchFriendshipsSnapshot } from "@/data/friendships";
import {
  addDaysToDateKey,
  fetchLeaderboardSnapshot,
  getTodayDateKey,
  LeaderboardPlayer,
  LeaderboardQuestionResult,
  LeaderboardSnapshot,
  LeaderboardWeeklyPlayer,
} from "@/data/leaderboard";
import { useFocusEffect } from "expo-router";
import { ChevronLeft, ChevronRight, UserRoundPlus } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ThemeColors = ReturnType<typeof useThemeColors>;

const formatDateLabel = (dateKey: string) =>
  new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const formatWeekRangeLabel = (startDateKey: string, endDateKey: string) => {
  const startDate = new Date(`${startDateKey}T12:00:00`);
  const endDate = new Date(`${endDateKey}T12:00:00`);
  const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
  const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }

  return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
};

function Avatar({
  initials,
  colors,
}: {
  initials: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.avatarWrap}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
          {initials}
        </Text>
      </View>
    </View>
  );
}

function ScoreSegment({
  question,
  colors,
}: {
  question: LeaderboardQuestionResult;
  colors: ThemeColors;
}) {
  const domainTheme = useDomainTheme(question.domain);
  const DomainIcon = domainTheme.icon;
  const isCorrect = question.status === "correct";
  const isIncorrect = question.status === "incorrect";

  return (
    <View
      style={[
        styles.segment,
        {
          backgroundColor: isCorrect
            ? colors.correct + "10"
            : isIncorrect
              ? colors.incorrect + "10"
              : colors.divider,
          borderColor: isCorrect
            ? colors.correct
            : isIncorrect
              ? colors.incorrect
              : colors.border,
        },
      ]}
    >
      <DomainIcon
        size={12}
        color={
          isCorrect
            ? colors.correct
            : isIncorrect
              ? colors.incorrect
              : colors.textTertiary
        }
        strokeWidth={2.4}
      />
    </View>
  );
}

function SegmentedScoreBar({
  questions,
  total,
  score,
  colors,
}: {
  questions: LeaderboardQuestionResult[];
  total: number;
  score: number;
  colors: ThemeColors;
}) {
  return (
    <View
      style={styles.segmentedBar}
      accessibilityLabel={`${score} out of ${total}`}
    >
      {questions.map((question) => (
        <ScoreSegment
          key={`${question.position}-${question.domain}`}
          question={question}
          colors={colors}
        />
      ))}
    </View>
  );
}

function PlayerResultRow({
  player,
  isCurrentUser = false,
  colors,
}: {
  player: LeaderboardPlayer;
  isCurrentUser?: boolean;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.resultRow,
        {
          backgroundColor: isCurrentUser ? colors.surfaceAlt : colors.surface,
          borderBottomColor: colors.divider,
        },
      ]}
    >
      <Avatar initials={player.initials} colors={colors} />
      <View style={styles.resultNameBlock}>
        <Text
          numberOfLines={1}
          style={[
            styles.resultName,
            isCurrentUser && styles.currentUserName,
            { color: colors.textPrimary },
          ]}
        >
          {player.displayName}
        </Text>
        {isCurrentUser && (
          <Text
            style={[styles.currentUserSubtext, { color: colors.textTertiary }]}
          >
            You
          </Text>
        )}
      </View>

      {player.result ? (
        <View style={styles.resultBlock}>
          <SegmentedScoreBar
            questions={player.result.questions}
            total={player.result.total}
            score={player.result.score}
            colors={colors}
          />
          <Text style={[styles.resultScore, { color: colors.textPrimary }]}>
            {player.result.score}/{player.result.total}
          </Text>
        </View>
      ) : (
        <Text style={[styles.notPlayedText, { color: colors.textTertiary }]}>
          Not played
        </Text>
      )}
    </View>
  );
}

function StreakPill({
  streak,
  colors,
}: {
  streak: number;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.weeklyStreakBadge,
        {
          backgroundColor: colors.warning + "15",
          borderColor: colors.warning + "30",
        },
      ]}
    >
      <Text style={styles.weeklyStreakFlame}>🔥</Text>
      <Text style={[styles.weeklyStreakCount, { color: colors.warning }]}>
        {streak} {streak === 1 ? "day" : "days"}
      </Text>
    </View>
  );
}

function WeeklyPlayerRow({
  player,
  colors,
}: {
  player: LeaderboardWeeklyPlayer;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.weeklyRow,
        {
          backgroundColor: player.isCurrentUser
            ? colors.surfaceAlt
            : colors.surface,
          borderBottomColor: colors.divider,
        },
      ]}
    >
      <Avatar initials={player.initials} colors={colors} />
      <View style={styles.weeklyNameBlock}>
        <Text
          numberOfLines={1}
          style={[
            styles.resultName,
            player.isCurrentUser && styles.currentUserName,
            { color: colors.textPrimary },
          ]}
        >
          {player.displayName}
        </Text>
        {player.isCurrentUser && (
          <Text
            style={[styles.currentUserSubtext, { color: colors.textTertiary }]}
          >
            You
          </Text>
        )}
      </View>
      <View style={styles.weeklyStatsBlock}>
        <StreakPill streak={player.streak} colors={colors} />
        <View style={styles.weeklyMetric}>
          <Text style={[styles.weeklyFraction, { color: colors.textPrimary }]}>
            {player.score}/{player.total}
          </Text>
        </View>
        <View style={styles.weeklyMetric}>
          <Text style={[styles.weeklyPercent, { color: colors.textSecondary }]}>
            {player.percent === null ? "--" : `${player.percent}%`}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function LeaderboardTabScreen() {
  const colors = useThemeColors();
  const [isFriendsModalVisible, setIsFriendsModalVisible] = useState(false);
  const [incomingRequestCount, setIncomingRequestCount] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayDateKey);
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadIncomingRequestCount = useCallback(async () => {
    try {
      const snapshot = await fetchFriendshipsSnapshot();
      setIncomingRequestCount(snapshot.incomingRequests.length);
    } catch {
      setIncomingRequestCount(0);
    }
  }, []);

  const loadLeaderboard = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }
      setErrorMessage(null);

      try {
        const nextSnapshot = await fetchLeaderboardSnapshot(selectedDateKey);
        setSnapshot(nextSnapshot);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load leaderboard right now.",
        );
        setSnapshot(null);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [selectedDateKey],
  );

  const refreshLeaderboard = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.all([loadIncomingRequestCount(), loadLeaderboard(false)]);
    } finally {
      setRefreshing(false);
    }
  }, [loadIncomingRequestCount, loadLeaderboard]);

  useFocusEffect(
    useCallback(() => {
      loadIncomingRequestCount();
      loadLeaderboard();
    }, [loadIncomingRequestCount, loadLeaderboard]),
  );

  const todayDateKey = getTodayDateKey();
  const dateLabel = useMemo(
    () => formatDateLabel(selectedDateKey),
    [selectedDateKey],
  );
  const isViewingToday = selectedDateKey >= todayDateKey;

  const handlePreviousDate = () => {
    setSelectedDateKey((dateKey) => addDaysToDateKey(dateKey, -1));
  };

  const handleNextDate = () => {
    setSelectedDateKey((dateKey) => {
      const nextDateKey = addDaysToDateKey(dateKey, 1);

      return nextDateKey > todayDateKey ? dateKey : nextDateKey;
    });
  };

  return (
    <ScreenContainer
      scrollable
      refreshing={refreshing}
      onRefresh={refreshLeaderboard}
      style={styles.container}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Leaderboard
        </Text>
        <Pressable
          accessibilityLabel="Manage friends"
          onPress={() => setIsFriendsModalVisible(true)}
          style={[
            styles.friendsButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <UserRoundPlus size={24} color={colors.primary} strokeWidth={2.2} />
          {incomingRequestCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.incorrect }]}>
              <Text style={styles.badgeText}>
                {incomingRequestCount > 99 ? "99+" : incomingRequestCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View
        style={[
          styles.dateSwitcher,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Pressable
          accessibilityLabel="Previous day"
          onPress={handlePreviousDate}
          style={styles.dateButton}
        >
          <ChevronLeft size={20} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.dateLabelBlock}>
          <Text style={[styles.dateLabel, { color: colors.textPrimary }]}>
            {dateLabel}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Next day"
          disabled={isViewingToday}
          onPress={handleNextDate}
          style={[styles.dateButton, isViewingToday && styles.disabledButton]}
        >
          <ChevronRight
            size={20}
            color={isViewingToday ? colors.textTertiary : colors.textSecondary}
          />
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!loading && errorMessage && (
        <View style={[styles.stateCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
            Leaderboard unavailable
          </Text>
          <Text style={[styles.stateCopy, { color: colors.textTertiary }]}>
            {errorMessage}
          </Text>
        </View>
      )}

      {!loading && snapshot && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Daily 5 Results
            </Text>
            {!snapshot.hasDailyPack && (
              <Text
                style={[styles.sectionMeta, { color: colors.textTertiary }]}
              >
                No pack found
              </Text>
            )}
          </View>

          <View
            style={[
              styles.resultList,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border + "70",
              },
            ]}
          >
            <PlayerResultRow
              player={snapshot.currentUser}
              isCurrentUser
              colors={colors}
            />
            {snapshot.friends.map((friend) => (
              <PlayerResultRow
                key={friend.userId}
                player={friend}
                colors={colors}
              />
            ))}
            {snapshot.friends.length === 0 && (
              <View style={styles.emptyFriends}>
                <Text
                  style={[
                    styles.emptyFriendsTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Add friends to compare Daily 5 results.
                </Text>
                <Text
                  style={[
                    styles.emptyFriendsCopy,
                    { color: colors.textTertiary },
                  ]}
                >
                  Accepted friends will show up here with answers and scores for
                  each day.
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.sectionHeader, styles.weeklySectionHeader]}>
            <View>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                This Week
              </Text>
              <Text
                style={[styles.sectionMeta, { color: colors.textTertiary }]}
              >
                {formatWeekRangeLabel(
                  snapshot.week.startDateKey,
                  snapshot.week.endDateKey,
                )}{" "}
                · lifetime streak and weekly score
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.resultList,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border + "70",
              },
            ]}
          >
            {snapshot.week.players.map((player) => (
              <WeeklyPlayerRow
                key={player.userId}
                player={player}
                colors={colors}
              />
            ))}
          </View>
        </>
      )}

      <FriendManagementModal
        visible={isFriendsModalVisible}
        onClose={() => {
          setIsFriendsModalVisible(false);
          loadIncomingRequestCount();
          loadLeaderboard();
        }}
        onIncomingRequestCountChange={(count) => {
          setIncomingRequestCount(count);
          loadLeaderboard();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.screen,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  title: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  friendsButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    position: "relative",
    width: 48,
  },
  badge: {
    alignItems: "center",
    borderRadius: Radius.pill,
    justifyContent: "center",
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 5,
    position: "absolute",
    right: -6,
    top: -6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    lineHeight: 14,
  },
  dateSwitcher: {
    alignItems: "center",
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xxl,
    padding: Spacing.sm,
    ...Shadow.card,
  },
  dateButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  disabledButton: {
    opacity: 0.45,
  },
  dateLabelBlock: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  dateLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
  },
  dateHint: {
    fontSize: FontSize.xs,
    marginTop: 2,
    textAlign: "center",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 240,
  },
  stateCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  stateTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  stateCopy: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.normal,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  sectionMeta: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  weeklySectionHeader: {
    marginTop: Spacing.xxl,
  },
  avatarWrap: {
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatar: {
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatarText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  segmentedBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
    width: 122,
  },
  segment: {
    alignItems: "center",
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  resultList: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    ...Shadow.card,
  },
  resultRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 66,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  resultNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  resultName: {
    flexShrink: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  currentUserName: {
    fontWeight: FontWeight.bold,
  },
  currentUserSubtext: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  resultBlock: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 5,
    justifyContent: "flex-end",
  },
  resultScore: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    minWidth: 28,
    textAlign: "right",
  },
  notPlayedText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  weeklyRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 66,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  weeklyNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  weeklyStatsBlock: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: Spacing.xs,
    justifyContent: "flex-end",
  },
  weeklyMetric: {
    alignItems: "flex-end",
    minWidth: 46,
  },
  weeklyStreakBadge: {
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  weeklyStreakFlame: {
    fontSize: FontSize.sm,
  },
  weeklyStreakCount: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  weeklyFraction: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: "right",
  },
  weeklyPercent: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: "right",
  },
  emptyFriends: {
    padding: Spacing.lg,
  },
  emptyFriendsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  emptyFriendsCopy: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.normal,
  },
});
