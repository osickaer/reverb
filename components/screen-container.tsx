import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/contexts/theme-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Override or extend the container style (e.g. for padding, justifyContent) */
  style?: StyleProp<ViewStyle>;
  /** Set to true when the screen content should scroll */
  scrollable?: boolean;
  /** Background color override. Defaults to theme background. */
  backgroundColor?: string;
  /** Edges to apply safe area padding to */
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  /** Pull-to-refresh state for scrollable screens */
  refreshing?: boolean;
  /** Pull-to-refresh handler for scrollable screens */
  onRefresh?: () => void | Promise<void>;
}

export function ScreenContainer({
  children,
  style,
  scrollable = false,
  backgroundColor,
  edges = ['top'],
  refreshing = false,
  onRefresh,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const bg = backgroundColor ?? colors.background;

  if (scrollable) {
    return (
      <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: bg }]}>
        <ScrollView
          style={styles.scroll}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void onRefresh();
                }}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
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
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: bg }, style]}>
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
