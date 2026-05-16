import {
  QUESTION_FEEDBACK_RATINGS,
  QUESTION_FEEDBACK_REASON_OPTIONS,
  QuestionFeedbackRating,
  QuestionFeedbackReasonCode,
  saveQuestionFeedback,
} from "@/data/question-feedback";
import { useThemeColors } from "@/contexts/theme-context";
import * as Haptics from "expo-haptics";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FontSize, FontWeight, Radius, Spacing } from "../constants/theme";

export function QuestionFeedbackControls({
  questionId,
}: {
  questionId: string;
}) {
  const colors = useThemeColors();
  const [rating, setRating] = useState<QuestionFeedbackRating | null>(null);
  const [reasonCodes, setReasonCodes] = useState<QuestionFeedbackReasonCode[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setRating(null);
    setReasonCodes([]);
    setSaveError(null);
    setSaving(false);
  }, [questionId]);

  const persistFeedback = async (
    nextRating: QuestionFeedbackRating,
    nextReasonCodes: QuestionFeedbackReasonCode[],
  ) => {
    setSaving(true);
    setSaveError(null);

    try {
      await saveQuestionFeedback({
        questionId,
        rating: nextRating,
        reasonCodes: nextReasonCodes,
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleRating = async (nextRating: QuestionFeedbackRating) => {
    const nextReasonCodes =
      nextRating === QUESTION_FEEDBACK_RATINGS.down ? reasonCodes : [];

    setRating(nextRating);
    setReasonCodes(nextReasonCodes);
    await Haptics.selectionAsync();
    await persistFeedback(nextRating, nextReasonCodes);
  };

  const handleReasonToggle = async (code: QuestionFeedbackReasonCode) => {
    if (rating !== QUESTION_FEEDBACK_RATINGS.down) return;

    const nextReasonCodes = reasonCodes.includes(code)
      ? reasonCodes.filter((reasonCode) => reasonCode !== code)
      : [...reasonCodes, code];

    setReasonCodes(nextReasonCodes);
    await Haptics.selectionAsync();
    await persistFeedback(rating, nextReasonCodes);
  };

  const isThumbsUp = rating === QUESTION_FEEDBACK_RATINGS.up;
  const isThumbsDown = rating === QUESTION_FEEDBACK_RATINGS.down;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Rate this question
        </Text>
        {saving && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <View style={styles.ratingRow}>
        <TouchableOpacity
          style={[
            styles.ratingButton,
            saving && styles.disabledButton,
            {
              backgroundColor: isThumbsUp
                ? colors.correct + "18"
                : colors.surfaceAlt,
              borderColor: isThumbsUp ? colors.correct : colors.border,
            },
          ]}
          activeOpacity={0.75}
          disabled={saving}
          onPress={() => handleRating(QUESTION_FEEDBACK_RATINGS.up)}
        >
          <ThumbsUp
            size={18}
            color={isThumbsUp ? colors.correct : colors.textSecondary}
            strokeWidth={2.25}
          />
          <Text
            style={[
              styles.ratingText,
              { color: isThumbsUp ? colors.correct : colors.textSecondary },
            ]}
          >
            Good
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.ratingButton,
            saving && styles.disabledButton,
            {
              backgroundColor: isThumbsDown
                ? colors.incorrect + "14"
                : colors.surfaceAlt,
              borderColor: isThumbsDown ? colors.incorrect : colors.border,
            },
          ]}
          activeOpacity={0.75}
          disabled={saving}
          onPress={() => handleRating(QUESTION_FEEDBACK_RATINGS.down)}
        >
          <ThumbsDown
            size={18}
            color={isThumbsDown ? colors.incorrect : colors.textSecondary}
            strokeWidth={2.25}
          />
          <Text
            style={[
              styles.ratingText,
              {
                color: isThumbsDown ? colors.incorrect : colors.textSecondary,
              },
            ]}
          >
            Needs work
          </Text>
        </TouchableOpacity>
      </View>

      {isThumbsDown && (
        <View style={styles.reasonsWrap}>
          <Text style={[styles.reasonPrompt, { color: colors.textTertiary }]}>
            What should we fix?
          </Text>
          <View style={styles.reasonChips}>
            {QUESTION_FEEDBACK_REASON_OPTIONS.map(({ code, label }) => {
              const selected = reasonCodes.includes(code);

              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.reasonChip,
                    saving && styles.disabledButton,
                    {
                      backgroundColor: selected
                        ? colors.incorrect + "14"
                        : colors.surfaceAlt,
                      borderColor: selected ? colors.incorrect : colors.border,
                    },
                  ]}
                  activeOpacity={0.75}
                  disabled={saving}
                  onPress={() => handleReasonToggle(code)}
                >
                  {selected && (
                    <Check
                      size={14}
                      color={colors.incorrect}
                      strokeWidth={2.5}
                    />
                  )}
                  <Text
                    style={[
                      styles.reasonChipText,
                      {
                        color: selected
                          ? colors.incorrect
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {saveError && (
        <Text style={[styles.errorText, { color: colors.incorrect }]}>
          {saveError}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  headerRow: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  ratingRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  ratingButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  disabledButton: {
    opacity: 0.7,
  },
  ratingText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  reasonsWrap: {
    gap: Spacing.sm,
  },
  reasonPrompt: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  reasonChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  reasonChip: {
    minHeight: 34,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  reasonChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  errorText: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
});
