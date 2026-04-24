import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/contexts/auth-context";
import { useAppTheme, useThemeColors } from "@/contexts/theme-context";
import {
  areDailyRemindersEnabled,
  setDailyRemindersEnabled,
  syncDailySessionReminder,
  triggerDebugNotification,
} from "@/utils/notifications";
import React, { useCallback, useState } from "react";
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import {
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from "../constants/theme";
import {
  clearReverbStorage,
  debugReverbStorage,
  listAllStorage,
} from "../utils/storage-debug";
import { loadSession } from "../utils/storage";

function SettingRow({
  title,
  value,
  onValueChange,
  onInfoPress,
  colors,
  colorScheme,
}: {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  onInfoPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  colorScheme: "light" | "dark";
}) {
  return (
    <View
      style={[
        styles.settingCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.settingCopy}>
        <View style={styles.settingTitleRow}>
          <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={onInfoPress}
            hitSlop={8}
            style={styles.infoButton}
          >
            <CircleAlert
              size={16}
              color={colors.textTertiary}
              strokeWidth={2.2}
            />
          </TouchableOpacity>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colorScheme === "dark" ? "#3A3A3C" : "#D1D1D6",
          true: "#34C759",
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colorScheme === "dark" ? "#3A3A3C" : "#D1D1D6"}
      />
    </View>
  );
}

export default function ProfileSettingsScreen() {
  const { colorScheme } = useAppTheme();
  const { signOut } = useAuth();
  const colors = useThemeColors();
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadPreference = async () => {
        const enabled = await areDailyRemindersEnabled();
        if (isActive) {
          setNotificationsEnabledState(enabled);
        }
      };

      loadPreference();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleToggleNotifications = async (nextValue: boolean) => {
    const enabled = await setDailyRemindersEnabled(nextValue);
    setNotificationsEnabledState(enabled);

    if (nextValue && !enabled) {
      Alert.alert(
        "Notifications unavailable",
        "Reverb could not enable reminders because notification permission was denied.",
      );
      return;
    }

    const session = await loadSession();
    if (session) {
      await syncDailySessionReminder({
        dateKey: session.date,
        isCompleted: session.status === "completed",
      });
    }
  };

  const handleNotificationInfo = () => {
    Alert.alert(
      "Daily reminders",
      "When enabled, Reverb schedules a reminder for 7:00 PM only if today's daily session has not already been completed.",
    );
  };

  const handleTriggerDebugNotification = async () => {
    const scheduled = await triggerDebugNotification(5);

    if (!scheduled) {
      Alert.alert(
        "Notifications disabled",
        "The test notification could not be scheduled because notification permission was denied.",
      );
      return;
    }

    Alert.alert(
      "Test scheduled",
      "A local notification is scheduled for 5 seconds from now. Put the app in the background to verify the system banner.",
    );
  };

  const handleTestDailyReminderLogic = async () => {
    const session = await loadSession();

    if (!session) {
      Alert.alert(
        "No daily session",
        "Open the Home tab once so today's daily session exists, then try again.",
      );
      return;
    }

    const targetDate = new Date(Date.now() + 5000);
    await syncDailySessionReminder({
      dateKey: session.date,
      isCompleted: session.status === "completed",
      targetDate,
    });

    if (session.status === "completed") {
      Alert.alert(
        "Session already completed",
        "No test reminder was scheduled because today's session is already marked completed.",
      );
      return;
    }

    if (!notificationsEnabled) {
      Alert.alert(
        "Notifications disabled",
        "Enable daily reminders first. The reminder logic will not schedule anything while notifications are off.",
      );
      return;
    }

    Alert.alert(
      "Reminder logic test scheduled",
      "The actual daily reminder path is scheduled to run in 5 seconds because today's session is incomplete. Put the app in the background to verify delivery.",
    );
  };

  const handleClearStorage = async () => {
    await clearReverbStorage();
    Alert.alert("Storage cleared", "Reverb session and stats data were cleared.");
  };

  const handleLogOut = () => {
    Alert.alert("Log out?", "You will need to log in again to use Reverb.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          const result = await signOut();

          if (result.error) {
            Alert.alert("Log out failed", result.error);
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer scrollable style={styles.contentContainer}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Notifications
      </Text>
      <SettingRow
        title="Daily reminders"
        value={notificationsEnabled}
        onValueChange={handleToggleNotifications}
        onInfoPress={handleNotificationInfo}
        colors={colors}
        colorScheme={colorScheme}
      />

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Account
      </Text>
      <TouchableOpacity
        style={[
          styles.accountButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.incorrect + "40",
          },
        ]}
        activeOpacity={0.7}
        onPress={handleLogOut}
      >
        <Text style={[styles.accountButtonText, { color: colors.incorrect }]}>
          Log out
        </Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Debug Tools
      </Text>
      <View style={[styles.debugSection, { borderTopColor: colors.border }]}>
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
          onPress={() => handleTriggerDebugNotification()}
        >
          <Text
            style={[styles.debugButtonText, { color: colors.textSecondary }]}
          >
            Trigger Test Notification
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.debugButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
          onPress={() => handleTestDailyReminderLogic()}
        >
          <Text
            style={[styles.debugButtonText, { color: colors.textSecondary }]}
          >
            Test Daily Reminder Logic
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
                  onPress: () => handleClearStorage(),
                },
              ],
            )
          }
        >
          <Text style={[styles.debugButtonText, { color: colors.incorrect }]}>
            Clear Storage
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: Spacing.screen,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  settingCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.xxl,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    ...Shadow.card,
  },
  settingCopy: {
    flex: 1,
  },
  settingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  settingTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  infoButton: {
    paddingVertical: 2,
  },
  debugSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
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
  accountButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: Spacing.xxl,
  },
  accountButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
