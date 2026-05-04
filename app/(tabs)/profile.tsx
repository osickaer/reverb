import { ScreenContainer } from "@/components/screen-container";
import { SocialProfileModal } from "@/components/social-profile-modal";
import { useAuth } from "@/contexts/auth-context";
import { useThemeColors } from "@/contexts/theme-context";
import { fetchCurrentUserProfile, Profile } from "@/data/profiles";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ChevronRight,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
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
  Radius,
  Shadow,
  Spacing,
} from "../../constants/theme";

export default function ProfileTabScreen() {
  const colors = useThemeColors();
  const { session } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const email = session?.user.email ?? "Signed in";

  const loadProfile = useCallback(async () => {
    setIsProfileLoading(true);
    setProfileError(null);

    try {
      const currentProfile = await fetchCurrentUserProfile();
      setProfile(currentProfile);
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Unable to load your social profile.",
      );
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  return (
    <ScreenContainer scrollable style={styles.contentContainer}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.heroIconWrap,
            { backgroundColor: colors.primary + "14" },
          ]}
        >
          <UserRound size={28} color={colors.primary} strokeWidth={2.2} />
        </View>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
          Profile
        </Text>

        {isProfileLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading profile
            </Text>
          </View>
        ) : (
          <View style={styles.profileDetails}>
            <ProfileField label="Email" value={email} />
            {profile ? (
              <>
                <ProfileField
                  label="Display Name"
                  value={profile.display_name}
                />
                <ProfileField label="Username" value={`${profile.username}`} />
              </>
            ) : (
              <Text
                style={[
                  styles.socialPromptText,
                  { color: colors.textSecondary },
                ]}
              >
                To enable social features, create a social profile.
              </Text>
            )}
            {profileError && (
              <Text style={[styles.errorText, { color: colors.incorrect }]}>
                {profileError}
              </Text>
            )}
            {!profile && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsCreateModalVisible(true)}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: colors.textInverse },
                  ]}
                >
                  Create social profile
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Menu
      </Text>
      <TouchableOpacity
        style={[
          styles.menuCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => router.push("/profile-settings")}
      >
        <View
          style={[styles.menuIconWrap, { backgroundColor: colors.background }]}
        >
          <SettingsIcon
            size={18}
            color={colors.textPrimary}
            strokeWidth={2.2}
          />
        </View>
        <View style={styles.menuCopy}>
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
            Settings
          </Text>
          <Text
            style={[styles.menuDescription, { color: colors.textSecondary }]}
          >
            Notifications and debug tools.
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.2} />
      </TouchableOpacity>
      <SocialProfileModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onCreated={setProfile}
      />
    </ScreenContainer>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();

  return (
    <View style={styles.profileField}>
      <Text style={[styles.profileFieldLabel, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <Text style={[styles.profileFieldValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: Spacing.screen,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  heroCard: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    marginBottom: Spacing.xxl,
    alignItems: "flex-start",
    ...Shadow.card,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  profileDetails: {
    width: "100%",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  profileField: {
    paddingVertical: Spacing.sm,
  },
  profileFieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
  },
  profileFieldValue: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.xs,
  },
  socialPromptText: {
    fontSize: FontSize.base,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.md,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.lg,
  },
  primaryButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  menuCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    ...Shadow.card,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menuCopy: {
    flex: 1,
  },
  menuTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  menuDescription: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
});
