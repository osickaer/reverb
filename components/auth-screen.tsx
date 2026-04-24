import { ScreenContainer } from "@/components/screen-container";
import {
  FontSize,
  FontWeight,
  LineHeight,
  Radius,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useThemeColors } from "@/contexts/theme-context";
import { Mail, UserRound } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export function AuthScreen() {
  const colors = useThemeColors();
  const { isLoading, isSubmitting, signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signUp" | "signIn">("signUp");

  const isFormDisabled = isSubmitting || !email.trim() || password.length < 6;
  const isSignUpMode = mode === "signUp";

  const handleSignIn = async () => {
    const result = await signIn(email, password);

    if (result.error) {
      Alert.alert("Sign in failed", result.error);
    }
  };

  const handleSignUp = async () => {
    const result = await signUp(email, password);

    if (result.error) {
      Alert.alert("Sign up failed", result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      Alert.alert(
        "Check your email",
        "We sent you a confirmation link. Open it to finish creating your account.",
      );
    }
  };

  return (
    <ScreenContainer scrollable style={styles.contentContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <View
          style={[
            styles.headerCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.headerIconWrap,
              { backgroundColor: colors.primary + "14" },
            ]}
          >
            <UserRound size={28} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Welcome to Reverb
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Create an account to keep your daily knowledge workout and progress
            connected to you.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>
                Email
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Mail size={18} color={colors.textTertiary} strokeWidth={2.1} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.input, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoComplete="password"
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                style={[
                  styles.passwordInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isFormDisabled}
              onPress={isSignUpMode ? handleSignUp : handleSignIn}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                isFormDisabled && styles.disabledButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? "Working..."
                  : isSignUpMode
                    ? "Create account"
                    : "Log in"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSubmitting}
              onPress={() => setMode(isSignUpMode ? "signIn" : "signUp")}
              style={styles.modeSwitch}
            >
              <Text
                style={[
                  styles.modeSwitchText,
                  { color: colors.textSecondary },
                ]}
              >
                {isSignUpMode
                  ? "Already have an account? Log in"
                  : "New to Reverb? Create an account"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: Spacing.screen,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  keyboardContainer: {
    flex: 1,
  },
  headerCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
    ...Shadow.card,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.base,
    lineHeight: LineHeight.normal,
    marginTop: Spacing.sm,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxxl,
  },
  formCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
    ...Shadow.card,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
  },
  inputWrap: {
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    minHeight: 48,
  },
  passwordInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.base,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.base,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  modeSwitch: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.base,
  },
  modeSwitchText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
