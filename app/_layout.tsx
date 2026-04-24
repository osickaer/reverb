import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthScreen } from "@/components/auth-screen";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AppThemeProvider, useAppTheme } from "@/contexts/theme-context";
import {
  areDailyRemindersEnabled,
  isNotificationPermissionUndetermined,
  setDailyRemindersEnabled,
  syncDailySessionReminder,
} from "@/utils/notifications";
import { initDailySessionIfNeeded } from "@/utils/storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const unstable_settings = {
  anchor: "(tabs)",
};

/** Inner layout that can read the theme context */
function RootLayoutInner() {
  const { colorScheme, colors } = useAppTheme();
  const { session, isLoading: isAuthLoading } = useAuth();
  const didRunStartupPrompt = useRef(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    const syncReminder = async () => {
      const session = await initDailySessionIfNeeded();
      await syncDailySessionReminder({
        dateKey: session.date,
        isCompleted: session.status === "completed",
      });

      if (didRunStartupPrompt.current) {
        return;
      }

      didRunStartupPrompt.current = true;

      const remindersEnabled = await areDailyRemindersEnabled();
      const permissionUndetermined =
        await isNotificationPermissionUndetermined();

      if (remindersEnabled || !permissionUndetermined) {
        return;
      }

      Alert.alert(
        "Stay on track with Reverb?",
        "Reverb can send a gentle evening nudge if you haven't finished today's session yet.",
        [
          {
            text: "Not now",
            style: "cancel",
          },
          {
            text: "Turn on reminders",
            onPress: async () => {
              const enabled = await setDailyRemindersEnabled(true);

              if (!enabled) {
                return;
              }

              await syncDailySessionReminder({
                dateKey: session.date,
                isCompleted: session.status === "completed",
              });
            },
          },
        ],
      );
    };

    syncReminder();
  }, [session]);

  // Build a custom navigation theme so header/background match our palette
  const navTheme =
    colorScheme === "dark"
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: colors.background,
            card: colors.surface,
            text: colors.textPrimary,
            border: colors.border,
            primary: colors.primary,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: colors.background,
            card: colors.background,
            text: colors.textPrimary,
            border: colors.border,
            primary: colors.primary,
          },
        };

  return (
    <ThemeProvider value={navTheme}>
      {isAuthLoading || !session ? (
        <AuthScreen />
      ) : (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerShadowVisible: false,
            headerBackTitle: "Back",
            contentStyle: { backgroundColor: colors.background },
            animation: "default",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="quiz"
            options={{
              headerShown: false,
              animation: "none",
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="session-summary"
            options={{
              headerShown: false,
              animation: "none",
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="session-history"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="profile-settings"
            options={{
              title: "Settings",
              headerShown: true,
            }}
          />
        </Stack>
      )}
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
