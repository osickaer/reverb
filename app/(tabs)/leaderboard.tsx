import { FriendManagementModal } from "@/components/friend-management-modal";
import { ScreenContainer } from "@/components/screen-container";
import { FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";
import { useThemeColors } from "@/contexts/theme-context";
import { fetchFriendshipsSnapshot } from "@/data/friendships";
import { useFocusEffect } from "expo-router";
import { UserRoundPlus } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function LeaderboardTabScreen() {
  const colors = useThemeColors();
  const [isFriendsModalVisible, setIsFriendsModalVisible] = useState(false);
  const [incomingRequestCount, setIncomingRequestCount] = useState(0);

  const loadIncomingRequestCount = useCallback(async () => {
    try {
      const snapshot = await fetchFriendshipsSnapshot();
      setIncomingRequestCount(snapshot.incomingRequests.length);
    } catch {
      setIncomingRequestCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadIncomingRequestCount();
    }, [loadIncomingRequestCount]),
  );

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.headerRow}>
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
            <View
              style={[styles.badge, { backgroundColor: colors.incorrect }]}
            >
              <Text style={styles.badgeText}>
                {incomingRequestCount > 99 ? "99+" : incomingRequestCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <FriendManagementModal
        visible={isFriendsModalVisible}
        onClose={() => setIsFriendsModalVisible(false)}
        onIncomingRequestCountChange={setIncomingRequestCount}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.screen,
    paddingTop: Spacing.xl,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
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
});
