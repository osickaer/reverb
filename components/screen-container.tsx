import React from 'react';
import { ScrollView, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Override or extend the container style (e.g. for padding, justifyContent) */
  style?: StyleProp<ViewStyle>;
  /** Set to true when the screen content should scroll */
  scrollable?: boolean;
  /** Background color of the screen. Defaults to Colors.background */
  backgroundColor?: string;
  /** Edges to apply safe area padding to */
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function ScreenContainer({
  children,
  style,
  scrollable = false,
  backgroundColor = Colors.background,
  edges = ['top'],
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  if (scrollable) {
    return (
      <SafeAreaView edges={edges} style={[styles.root, { backgroundColor }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom },
            style,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
