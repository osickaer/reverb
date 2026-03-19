/**
 * Domain Theme Configuration
 *
 * Maps each knowledge domain to a unique color palette & Lucide icon,
 * giving the quiz screen a visual "flavour" that changes per question.
 */

import {
  Atom,
  BookOpen,
  Globe,
  Laptop,
  Calculator,
  type LucideIcon,
} from "lucide-react-native";

export interface DomainTheme {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Vibrant accent color used for the icon and header strip */
  accent: string;
  /** Very light tint used as a background wash behind the domain badge */
  tint: string;
}

export const domainThemes: Record<string, DomainTheme> = {
  Science: {
    icon: Atom,
    accent: "#6C5CE7",
    tint: "#F0EEFF",
  },
  History: {
    icon: BookOpen,
    accent: "#D4710B",
    tint: "#FFF5EB",
  },
  Geography: {
    icon: Globe,
    accent: "#00A676",
    tint: "#EAFAF4",
  },
  Technology: {
    icon: Laptop,
    accent: "#0984E3",
    tint: "#EBF5FF",
  },
  Mathematics: {
    icon: Calculator,
    accent: "#E84393",
    tint: "#FFF0F7",
  },
};

/** Safe fallback for unknown domains */
export const defaultTheme: DomainTheme = {
  icon: BookOpen,
  accent: "#636E72",
  tint: "#F5F5F5",
};

export function getThemeForDomain(domain: string): DomainTheme {
  return domainThemes[domain] ?? defaultTheme;
}
