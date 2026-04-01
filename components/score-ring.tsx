import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { FontSize, FontWeight } from "../constants/theme";
import { useThemeColors } from "@/contexts/theme-context";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ScoreRing({
  score,
  total,
  size = 140,
  strokeWidth = 12,
}: {
  score: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const colors = useThemeColors();
  const percentage = total > 0 ? score / total : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - percentage)],
    extrapolate: "clamp",
  });

  const ringColor =
    percentage >= 0.8
      ? colors.correct
      : percentage >= 0.5
        ? colors.warning
        : colors.incorrect;

  const cx = size / 2;
  const cy = size / 2;

  const labelSize = size <= 100 ? FontSize.lg : FontSize.xxl;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.border + "50"}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <Text style={[styles.scoreNumber, { fontSize: labelSize, color: colors.textPrimary }]}>
        {score}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreNumber: {
    fontWeight: FontWeight.bold,
  },
});
