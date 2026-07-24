export type TumblrThemeSettings = {
  enabled: boolean;
  html: string;
};

export const DEFAULT_TUMBLR_THEME: TumblrThemeSettings = {
  enabled: false,
  html: "",
};

export function normalizeTumblrTheme(
  value?: Partial<TumblrThemeSettings> | null,
): TumblrThemeSettings {
  return {
    enabled: Boolean(value?.enabled && value?.html?.trim()),
    html: typeof value?.html === "string" ? value.html : "",
  };
}
