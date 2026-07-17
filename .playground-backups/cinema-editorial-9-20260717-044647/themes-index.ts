import type { CSSProperties } from "react";

export type ThemeLayout =
  | "editorial"
  | "grid"
  | "cinematic"
  | "desktop"
  | "sidebar"
  | "press";

export type MusicPlacement =
  | "inline"
  | "compact"
  | "card"
  | "floating"
  | "sidebar"
  | "hero";

export type PlaygroundTheme = {
  id: string;
  name: string;
  description: string;
  layout: ThemeLayout;
  musicPlacement: MusicPlacement;
  className: string;
  colors: {
    background: string;
    surface: string;
    foreground: string;
    muted: string;
    accent: string;
    border: string;
  };
  radius: string;
  headingFont: string;
  bodyFont: string;
  contentWidth: string;
};

export const DEFAULT_THEME_ID = "ivory-index";

export const playgroundThemes: PlaygroundTheme[] = [
  {
    id: "ivory-index",
    name: "Ivory Index",
    description: "Warm editorial whitespace and a restrained inline player.",
    layout: "editorial",
    musicPlacement: "inline",
    className: "theme-ivory-index",
    colors: {
      background: "#f3efe6",
      surface: "#faf7f0",
      foreground: "#1e1c18",
      muted: "#7d756a",
      accent: "#9b2f25",
      border: "rgba(30, 28, 24, 0.18)",
    },
    radius: "2px",
    headingFont: 'Georgia, "Times New Roman", serif',
    bodyFont: 'Georgia, "Times New Roman", serif',
    contentWidth: "980px",
  },
  {
    id: "contact-sheet",
    name: "Contact Sheet",
    description: "A photography-first grid with a compact utility player.",
    layout: "grid",
    musicPlacement: "compact",
    className: "theme-contact-sheet",
    colors: {
      background: "#eeeeea",
      surface: "#ffffff",
      foreground: "#151515",
      muted: "#6f6f68",
      accent: "#ff4e00",
      border: "rgba(21, 21, 21, 0.24)",
    },
    radius: "0px",
    headingFont: '"Helvetica Neue", Arial, sans-serif',
    bodyFont: '"Courier New", monospace',
    contentWidth: "1240px",
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Layered black panels with a dedicated music card.",
    layout: "cinematic",
    musicPlacement: "card",
    className: "theme-graphite",
    colors: {
      background: "#101010",
      surface: "#1a1a1a",
      foreground: "#f1eee8",
      muted: "#96928b",
      accent: "#e6a23c",
      border: "rgba(255, 255, 255, 0.12)",
    },
    radius: "18px",
    headingFont: 'Georgia, "Times New Roman", serif',
    bodyFont: '"Helvetica Neue", Arial, sans-serif',
    contentWidth: "1120px",
  },
  {
    id: "eight-bit",
    name: "Eight Bit",
    description: "A nostalgic windowed profile with a floating player.",
    layout: "desktop",
    musicPlacement: "floating",
    className: "theme-eight-bit",
    colors: {
      background: "#f2dce6",
      surface: "#fff8fc",
      foreground: "#493746",
      muted: "#8b657c",
      accent: "#c73f7c",
      border: "#9f4d78",
    },
    radius: "14px",
    headingFont: '"Courier New", monospace',
    bodyFont: '"Courier New", monospace',
    contentWidth: "1040px",
  },
  {
    id: "stardust",
    name: "Stardust",
    description: "A dreamy sidebar profile with music living in the rail.",
    layout: "sidebar",
    musicPlacement: "sidebar",
    className: "theme-stardust",
    colors: {
      background: "#17142a",
      surface: "#211d38",
      foreground: "#f6efff",
      muted: "#b8add0",
      accent: "#c59cff",
      border: "rgba(197, 156, 255, 0.35)",
    },
    radius: "18px",
    headingFont: 'Georgia, "Times New Roman", serif',
    bodyFont: '"Helvetica Neue", Arial, sans-serif',
    contentWidth: "1160px",
  },
  {
    id: "press-kit",
    name: "Press Kit",
    description: "An artist-facing hero layout with prominent music.",
    layout: "press",
    musicPlacement: "hero",
    className: "theme-press-kit",
    colors: {
      background: "#0c0c0d",
      surface: "#151517",
      foreground: "#ffffff",
      muted: "#a0a0a6",
      accent: "#fff200",
      border: "rgba(255, 255, 255, 0.14)",
    },
    radius: "24px",
    headingFont: '"Helvetica Neue", Arial, sans-serif',
    bodyFont: '"Helvetica Neue", Arial, sans-serif',
    contentWidth: "1180px",
  },
  {
    id: "film-archive",
    name: "Film Archive",
    description:
      "A cinematic institutional archive with film-strip records, catalog drawers, and a light-table gallery.",
    layout: "grid",
    musicPlacement: "card",
    className: "theme-film-archive",
    colors: {
      background: "#d7cfba",
      surface: "#eee8d8",
      foreground: "#181713",
      muted: "#6e6859",
      accent: "#a33a28",
      border: "rgba(24, 23, 19, 0.28)",
    },
    radius: "2px",
    headingFont: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif',
    bodyFont: '"Courier New", monospace',
    contentWidth: "1320px",
  },

];

export function getTheme(themeId?: string): PlaygroundTheme {
  return playgroundThemes.find((theme) => theme.id === themeId)
    ?? playgroundThemes[0];
}

export type ThemeStyle = CSSProperties & Record<`--pg-${string}`, string>;

export function getThemeStyle(theme: PlaygroundTheme): ThemeStyle {
  return {
    "--pg-background": theme.colors.background,
    "--pg-surface": theme.colors.surface,
    "--pg-foreground": theme.colors.foreground,
    "--pg-muted": theme.colors.muted,
    "--pg-accent": theme.colors.accent,
    "--pg-border": theme.colors.border,
    "--pg-radius": theme.radius,
    "--pg-heading-font": theme.headingFont,
    "--pg-body-font": theme.bodyFont,
    "--pg-content-width": theme.contentWidth,
  };
}
