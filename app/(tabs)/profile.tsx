import { ScreenContainer } from "@/components/screen-container";
import { useThemeColors } from "@/contexts/theme-context";
import { useRouter } from "expo-router";
import { ChevronRight, Settings as SettingsIcon, UserRound } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "../../constants/theme";

export default function ProfileTabScreen() {
  const colors = useThemeColors();
  const router = useRouter();

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
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          This is where profile customizations, preferences, and account-level
          controls can grow over time.
        </Text>
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
          style={[
            styles.menuIconWrap,
            { backgroundColor: colors.background },
          ]}
        >
          <SettingsIcon size={18} color={colors.textPrimary} strokeWidth={2.2} />
        </View>
        <View style={styles.menuCopy}>
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
            Settings
          </Text>
          <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
            Notifications and debug tools.
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2.2} />
      </TouchableOpacity>
    </ScreenContainer>
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
  pageSubtitle: {
    fontSize: FontSize.base,
    lineHeight: LineHeight.normal,
    marginTop: Spacing.sm,
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
