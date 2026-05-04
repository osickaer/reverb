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
  createCurrentUserProfile,
  normalizeUsername,
  Profile,
  validateProfileInput,
} from "@/data/profiles";
import { UserPlus, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface SocialProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (profile: Profile) => void;
}

export function SocialProfileModal({
  visible,
  onClose,
  onCreated,
}: SocialProfileModalProps) {
  const colors = useThemeColors();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedUsername = useMemo(
    () => normalizeUsername(username),
    [username],
  );
  const validationError = validateProfileInput({
    username: normalizedUsername,
    displayName,
  });
  const isCreateDisabled = isSubmitting || validationError !== null;
  const shouldShowValidation = username.length > 0 || displayName.length > 0;
  const visibleErrorMessage =
    errorMessage ?? (shouldShowValidation ? validationError : null);

  useEffect(() => {
    if (visible) {
      return;
    }

    setUsername("");
    setDisplayName("");
    setErrorMessage(null);
    setIsSubmitting(false);
  }, [visible]);

  const handleUsernameChange = (value: string) => {
    setUsername(normalizeUsername(value));
    setErrorMessage(null);
  };

  const handleCreateProfile = async () => {
    const inputError = validateProfileInput({
      username: normalizedUsername,
      displayName,
    });

    if (inputError) {
      setErrorMessage(inputError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createdProfile = await createCurrentUserProfile({
        username: normalizedUsername,
        displayName,
      });
      onCreated(createdProfile);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create your social profile.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardContainer}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.headerIconWrap,
                  { backgroundColor: colors.primary + "14" },
                ]}
              >
                <UserPlus size={24} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Pressable
                accessibilityLabel="Close profile creation"
                hitSlop={10}
                onPress={onClose}
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.background },
                ]}
              >
                <X size={18} color={colors.textSecondary} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Create social profile
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Pick a unique username and display name before adding friends or
              comparing daily knowledge workouts.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                placeholder="username"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                Lowercase letters, numbers, and underscores.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textTertiary }]}>
                Display name
              </Text>
              <TextInput
                value={displayName}
                onChangeText={(value) => {
                  setDisplayName(value);
                  setErrorMessage(null);
                }}
                autoCorrect={false}
                maxLength={40}
                placeholder="Your Name"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            {visibleErrorMessage && (
              <Text style={[styles.errorText, { color: colors.incorrect }]}>
                {visibleErrorMessage}
              </Text>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isCreateDisabled}
              onPress={handleCreateProfile}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                isCreateDisabled && styles.disabledButton,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: colors.textInverse },
                  ]}
                >
                  Create social profile
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    padding: Spacing.screen,
    justifyContent: "center",
  },
  keyboardContainer: {
    width: "100%",
  },
  modalCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
    ...Shadow.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.base,
    lineHeight: LineHeight.normal,
    marginTop: -Spacing.sm,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.base,
  },
  helperText: {
    fontSize: FontSize.xs,
    lineHeight: LineHeight.tight,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: LineHeight.tight,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.base,
  },
  primaryButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
