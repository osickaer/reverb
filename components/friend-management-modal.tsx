import {
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { useThemeColors } from "@/contexts/theme-context";
import {
  acceptFriendRequest,
  fetchFriendshipsSnapshot,
  FriendRelationship,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "@/data/friendships";
import {
  Check,
  Clock3,
  RefreshCw,
  Search,
  Send,
  UserRoundPlus,
  UserX,
  UsersRound,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type FriendsTab = "friends" | "incoming" | "outgoing";

const pendingStatus = "pending";
const friendsTabs: { label: string; value: FriendsTab }[] = [
  { label: "Friends", value: "friends" },
  { label: "Incoming", value: "incoming" },
  { label: "Outgoing", value: "outgoing" },
];

interface FriendManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onIncomingRequestCountChange?: (count: number) => void;
}

export function FriendManagementModal({
  visible,
  onClose,
  onIncomingRequestCountChange,
}: FriendManagementModalProps) {
  const colors = useThemeColors();
  const [username, setUsername] = useState("");
  const [activeTab, setActiveTab] = useState<FriendsTab>("friends");
  const [friends, setFriends] = useState<FriendRelationship[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<
    FriendRelationship[]
  >([]);
  const [outgoingRequests, setOutgoingRequests] = useState<
    FriendRelationship[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [busyFriendshipId, setBusyFriendshipId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const normalizedUsername = useMemo(
    () => username.trim().toLowerCase().replace(/^@/, ""),
    [username],
  );
  const canSendRequest =
    normalizedUsername.length >= 3 && !isSending && !isLoading;

  const loadFriendships = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const snapshot = await fetchFriendshipsSnapshot();
      setFriends(snapshot.friends);
      setIncomingRequests(snapshot.incomingRequests);
      setOutgoingRequests(snapshot.outgoingRequests);
      onIncomingRequestCountChange?.(snapshot.incomingRequests.length);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load friend requests.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [onIncomingRequestCountChange]);

  useEffect(() => {
    if (!visible) {
      setUsername("");
      setErrorMessage(null);
      setSuccessMessage(null);
      setBusyFriendshipId(null);
      setIsSending(false);
      return;
    }

    loadFriendships();
  }, [loadFriendships, visible]);

  const handleSendRequest = async () => {
    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const request = await sendFriendRequest(normalizedUsername);
      setOutgoingRequests((currentRequests) => [request, ...currentRequests]);
      setUsername("");
      setActiveTab("outgoing");
      setSuccessMessage(`Friend request sent to @${request.profile.username}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to send request.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptRequest = async (request: FriendRelationship) => {
    setBusyFriendshipId(request.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await acceptFriendRequest(request.id);
      setIncomingRequests((currentRequests) =>
        currentRequests.filter((current) => current.id !== request.id),
      );
      onIncomingRequestCountChange?.(
        Math.max(incomingRequests.length - 1, 0),
      );
      setFriends((currentFriends) => [
        { ...request, status: "accepted" },
        ...currentFriends,
      ]);
      setActiveTab("friends");
      setSuccessMessage(`You and @${request.profile.username} are now friends.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to accept friend request.",
      );
    } finally {
      setBusyFriendshipId(null);
    }
  };

  const handleRejectRequest = async (request: FriendRelationship) => {
    setBusyFriendshipId(request.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await rejectFriendRequest(request.id);
      setIncomingRequests((currentRequests) =>
        currentRequests.filter((current) => current.id !== request.id),
      );
      onIncomingRequestCountChange?.(
        Math.max(incomingRequests.length - 1, 0),
      );
      setSuccessMessage(
        `Friend request from @${request.profile.username} rejected.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to reject friend request.",
      );
    } finally {
      setBusyFriendshipId(null);
    }
  };

  const handleRemoveFriend = async (friend: FriendRelationship) => {
    Alert.alert(
      "Remove friend?",
      `Remove @${friend.profile.username} from your friends?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeConfirmedFriend(friend),
        },
      ],
    );
  };

  const removeConfirmedFriend = async (friend: FriendRelationship) => {
    setBusyFriendshipId(friend.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await removeFriend(friend.id);
      setFriends((currentFriends) =>
        currentFriends.filter((current) => current.id !== friend.id),
      );
      setSuccessMessage(`@${friend.profile.username} was removed from friends.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to remove friend.",
      );
    } finally {
      setBusyFriendshipId(null);
    }
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.sheetPage, { backgroundColor: colors.background }]}
      >
        <View style={styles.sheetHandleWrap}>
          <View
            style={[
              styles.sheetHandle,
              { backgroundColor: colors.textTertiary },
            ]}
          />
        </View>

        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View
              style={[
                styles.headerIconWrap,
                { backgroundColor: colors.primary + "14" },
              ]}
            >
              <UserRoundPlus
                size={24}
                color={colors.primary}
                strokeWidth={2.2}
              />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Friends
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close friend management"
            hitSlop={10}
            onPress={onClose}
            style={[
              styles.closeButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <X size={18} color={colors.textSecondary} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Add friend
              </Text>
              <View
                style={[
                  styles.searchRow,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Search
                  size={18}
                  color={colors.textTertiary}
                  strokeWidth={2.2}
                />
                <TextInput
                  value={username}
                  onChangeText={(value) => {
                    setUsername(value);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Search username"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={!canSendRequest}
                onPress={handleSendRequest}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  !canSendRequest && styles.disabledButton,
                ]}
              >
                {isSending ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Send
                      size={18}
                      color={colors.textInverse}
                      strokeWidth={2.2}
                    />
                    <Text
                      style={[
                        styles.primaryButtonText,
                        { color: colors.textInverse },
                      ]}
                    >
                      Send request
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              {errorMessage && (
                <Text style={[styles.feedbackText, { color: colors.incorrect }]}>
                  {errorMessage}
                </Text>
              )}
              {successMessage && (
                <Text style={[styles.feedbackText, { color: colors.correct }]}>
                  {successMessage}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.tabSection}>
            <View
              style={[
                styles.tabBar,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {friendsTabs.map((tab) => {
                const isActive = activeTab === tab.value;

                return (
                  <Pressable
                    key={tab.value}
                    onPress={() => setActiveTab(tab.value)}
                    style={[
                      styles.tabButton,
                      isActive && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabButtonText,
                        {
                          color: isActive
                            ? colors.textInverse
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {tab.value === "incoming" && incomingRequests.length > 0 && (
                      <CountBadge count={incomingRequests.length} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text
                  style={[styles.loadingText, { color: colors.textSecondary }]}
                >
                  Loading friends
                </Text>
              </View>
            ) : (
              <>
                {activeTab === "friends" && (
                  <FriendRequestSection
                    title="Friends"
                    icon={<UsersRound size={18} strokeWidth={2.2} />}
                    requests={friends}
                    emptyTitle="No friends yet"
                    emptyBody="Accepted friends will appear here."
                    renderActions={(friend) => (
                      <IconButton
                        label="Remove friend"
                        icon={<UserX size={16} strokeWidth={2.4} />}
                        color={colors.textTertiary}
                        isLoading={busyFriendshipId === friend.id}
                        onPress={() => handleRemoveFriend(friend)}
                      />
                    )}
                  />
                )}

                {activeTab === "incoming" && (
                  <FriendRequestSection
                    title="Incoming requests"
                    icon={<UserRoundPlus size={18} strokeWidth={2.2} />}
                    requests={incomingRequests}
                    emptyTitle="No requests waiting"
                    emptyBody="Friend requests sent to you will appear here."
                    renderActions={(request) => (
                      <View style={styles.actionRow}>
                        <IconButton
                          label="Accept friend request"
                          icon={<Check size={16} strokeWidth={2.4} />}
                          color={colors.correct}
                          isLoading={busyFriendshipId === request.id}
                          onPress={() => handleAcceptRequest(request)}
                        />
                        <IconButton
                          label="Reject friend request"
                          icon={<UserX size={16} strokeWidth={2.4} />}
                          color={colors.incorrect}
                          isLoading={busyFriendshipId === request.id}
                          onPress={() => handleRejectRequest(request)}
                        />
                      </View>
                    )}
                  />
                )}

                {activeTab === "outgoing" && (
                  <FriendRequestSection
                    title="Outgoing requests"
                    icon={<Clock3 size={18} strokeWidth={2.2} />}
                    requests={outgoingRequests}
                    emptyTitle="No pending requests"
                    emptyBody="Requests you send will stay here until they are answered."
                    renderActions={() => (
                      <Text
                        style={[
                          styles.statusText,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {pendingStatus}
                      </Text>
                    )}
                  />
                )}
              </>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isLoading}
              onPress={loadFriendships}
              style={[
                styles.refreshButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isLoading && styles.disabledButton,
              ]}
            >
              <RefreshCw
                size={16}
                color={colors.textSecondary}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.refreshButtonText,
                  { color: colors.textSecondary },
                ]}
              >
                Refresh
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function CountBadge({ count }: { count: number }) {
  const colors = useThemeColors();
  const label = count > 99 ? "99+" : String(count);

  return (
    <View style={[styles.countBadge, { backgroundColor: colors.incorrect }]}>
      <Text style={styles.countBadgeText}>{label}</Text>
    </View>
  );
}

function FriendRequestSection({
  title,
  icon,
  requests,
  emptyTitle,
  emptyBody,
  renderActions,
}: {
  title: string;
  icon: React.ReactElement<{ color?: string }>;
  requests: FriendRelationship[];
  emptyTitle: string;
  emptyBody: string;
  renderActions: (request: FriendRelationship) => React.ReactNode;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {React.cloneElement(icon, { color: colors.textSecondary })}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
      </View>

      {requests.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        requests.map((request) => (
          <View
            key={request.id}
            style={[
              styles.requestRow,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.requestCopy}>
              <Text style={[styles.requestName, { color: colors.textPrimary }]}>
                {request.profile.display_name}
              </Text>
              <Text
                style={[styles.requestUsername, { color: colors.textTertiary }]}
              >
                @{request.profile.username}
              </Text>
            </View>
            {renderActions(request)}
          </View>
        ))
      )}
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.emptyState,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
        {body}
      </Text>
    </View>
  );
}

function IconButton({
  label,
  icon,
  color,
  isLoading = false,
  onPress,
}: {
  label: string;
  icon: React.ReactElement<{ color?: string }>;
  color: string;
  isLoading?: boolean;
  onPress?: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityLabel={label}
      disabled={isLoading}
      onPress={onPress}
      style={[
        styles.iconButton,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isLoading && styles.disabledButton,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        React.cloneElement(icon, { color })
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheetPage: {
    flex: 1,
  },
  sheetHandleWrap: {
    alignItems: "center",
    paddingTop: Spacing.sm,
  },
  sheetHandle: {
    borderRadius: Radius.pill,
    height: 4,
    opacity: 0.35,
    width: 40,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
  },
  headerTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.md,
    minWidth: 0,
  },
  headerIconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  scrollContent: {
    gap: Spacing.base,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.xl,
  },
  sectionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  section: {
    gap: Spacing.md,
  },
  tabSection: {
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  tabBar: {
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.xs,
    padding: Spacing.xs,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: Radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.xs,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: Spacing.sm,
  },
  tabButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  countBadge: {
    alignItems: "center",
    borderRadius: Radius.pill,
    justifyContent: "center",
    minHeight: 18,
    minWidth: 18,
    paddingHorizontal: 5,
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: FontWeight.bold,
    lineHeight: 14,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  searchRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.base,
    minWidth: 0,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.base,
  },
  primaryButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  feedbackText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: LineHeight.tight,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  emptyState: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.base,
  },
  emptyTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  emptyBody: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.tight,
    marginTop: Spacing.xs,
  },
  requestRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 64,
    padding: Spacing.md,
  },
  requestCopy: {
    flex: 1,
    minWidth: 0,
  },
  requestName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  requestUsername: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textTransform: "capitalize",
  },
  refreshButton: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 40,
    paddingHorizontal: Spacing.base,
  },
  refreshButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
