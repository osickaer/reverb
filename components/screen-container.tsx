import React from 'react';
import { ScrollView, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Override or extend the container style (e.g. for padding, justifyContent) */
  style?: StyleProp<ViewStyle>;
  /** Set to true when the screen content should scroll */
  scrollable?: boolean;
  /** Background color of the screen. Defaults to Colors.background */
  backgroundColor?: string;
}

/**
 * ScreenContainer
 *
 * The standard root wrapper for every screen in the app.
 * Uses SafeAreaView so content is always offset below the status bar
 * (and above the home indicator on newer iPhones) without any visible band —
 * the background color fills the inset area seamlessly.
 *
 * Usage (non-scrolling):
 *   <ScreenContainer style={{ justifyContent: 'center', alignItems: 'center' }}>
 *     ...
 *   </ScreenContainer>
 *
 * Usage (scrolling):
 *   <ScreenContainer scrollable>
 *     ...
 *   </ScreenContainer>
 */
export function ScreenContainer({
  children,
  style,
  scrollable = false,
  backgroundColor = Colors.background,
}: ScreenContainerProps) {
  if (scrollable) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, style]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor }, style]}>
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
