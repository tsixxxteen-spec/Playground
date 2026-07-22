import { playgroundThemes } from "../../themes";

export type MarketplaceTier = "Included" | "Premium";
export type MarketplaceStatus = "available" | "installed";

export type MarketplaceTheme = {
  id: string;
  name: string;
  description: string;
  category: string;
  featured: boolean;
  tier: MarketplaceTier;
  status: MarketplaceStatus;
  creator: string;
  version: string;
  tags: string[];
  preview: {
    background: string;
    surface: string;
    foreground: string;
    accent: string;
    border: string;
  };
};

const premiumCandidates = new Set([
  "orbit",
  "infinite-desk",
  "memory-wall",
  "split-reality",
  "terminal-dream",
]);

export const marketplaceCatalog: MarketplaceTheme[] = playgroundThemes.map(
  (theme, index) => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    category: theme.category,
    featured: Boolean(theme.featured),
    tier: premiumCandidates.has(theme.id) ? "Premium" : "Included",
    status: "installed",
    creator: "Playground Studio",
    version: `1.${Math.floor(index / 10)}.${index % 10}`,
    tags: [
      theme.category,
      theme.layout,
      theme.musicPlacement,
      theme.featured ? "Featured" : "Library",
    ],
    preview: {
      background: theme.colors.background,
      surface: theme.colors.surface,
      foreground: theme.colors.foreground,
      accent: theme.colors.accent,
      border: theme.colors.border,
    },
  }),
);
