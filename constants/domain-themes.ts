/**
 * Domain Theme Configuration
 *
 * Maps each knowledge domain to a unique color palette & Lucide icon,
 * giving the quiz screen a visual "flavour" that changes per question.
 */

import { BookOpen, Globe, Sigma, type LucideIcon } from "lucide-react-native";
import { useAppTheme, type ResolvedScheme } from "@/contexts/theme-context";

export interface DomainTheme {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Vibrant accent color used for the icon and header strip */
  accent: string;
  /** Very light tint used as a background wash behind the domain badge */
  tint: string;
}

type ThemedDomainTheme = {
  icon: LucideIcon;
  light: Omit<DomainTheme, "icon">;
  dark: Omit<DomainTheme, "icon">;
};

export const domainThemes: Record<string, ThemedDomainTheme> = {
  History: {
    icon: BookOpen,
    light: {
      accent: "#D4710B",
      tint: "#FFF5EB",
    },
    dark: {
      accent: "#F5A34A",
      tint: "#352312",
    },
  },
  Geography: {
    icon: Globe,
    light: {
      accent: "#00A676",
      tint: "#EAFAF4",
    },
    dark: {
      accent: "#3DD6A5",
      tint: "#103228",
    },
  },
  Math: {
    icon: Sigma,
    light: {
      accent: "#7C3AED",
      tint: "#F5F3FF",
    },
    dark: {
      accent: "#A970FF",
      tint: "#26163F",
    },
  },
};

/** Safe fallback for unknown domains */
export const defaultTheme: Record<ResolvedScheme, DomainTheme> = {
  light: {
    icon: BookOpen,
    accent: "#636E72",
    tint: "#F5F5F5",
  },
  dark: {
    icon: BookOpen,
    accent: "#A0A7AE",
    tint: "#2A2A2C",
  },
};

export function getThemeForDomain(
  domain: string,
  scheme: ResolvedScheme = "light",
): DomainTheme {
  const theme = domainThemes[domain];
  if (!theme) {
    return defaultTheme[scheme];
  }

  return {
    icon: theme.icon,
    accent: theme[scheme].accent,
    tint: theme[scheme].tint,
  };
}

export function useDomainTheme(domain: string): DomainTheme {
  const { colorScheme } = useAppTheme();
  return getThemeForDomain(domain, colorScheme);
}
