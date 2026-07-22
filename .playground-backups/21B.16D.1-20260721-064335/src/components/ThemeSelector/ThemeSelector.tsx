import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  getTheme,
  playgroundThemes,
  type EditorialCategory,
} from "../../themes";
import "./ThemeSelector.css";

type Props = {
  value: string;
  onChange: (themeId: string) => void;
};

const RECENT_KEY = "playground.editorials.recent.v2";
const FAVORITES_KEY = "playground.editorials.favorites.v1";
const MAX_RECENT = 4;

function readStringArray(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function uniqueCategories(): Array<EditorialCategory | "All"> {
  const values = Array.from(
    new Set(playgroundThemes.map((theme) => theme.category)),
  ).sort((a, b) => a.localeCompare(b));

  return ["All", ...values];
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ThemeSelector({ value, onChange }: Props) {
  const selected = getTheme(value);
  const categories = useMemo(uniqueCategories, []);
  const [category, setCategory] =
    useState<EditorialCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>(() =>
    readStringArray(RECENT_KEY),
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    readStringArray(FAVORITES_KEY),
  );
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleThemes = useMemo(() => {
    return playgroundThemes.filter((theme) => {
      const matchesCategory =
        category === "All" || theme.category === category;

      const searchable = [
        theme.name,
        theme.category,
        theme.description,
        theme.layout,
        theme.musicPlacement,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesCategory &&
        (normalizedQuery.length === 0 ||
          searchable.includes(normalizedQuery))
      );
    });
  }, [category, normalizedQuery]);

  const favoriteThemes = useMemo(
    () =>
      favoriteIds
        .map((id) => playgroundThemes.find((theme) => theme.id === id))
        .filter(
          (theme): theme is (typeof playgroundThemes)[number] =>
            Boolean(theme),
        ),
    [favoriteIds],
  );

  const recentThemes = useMemo(
    () =>
      recentIds
        .map((id) => playgroundThemes.find((theme) => theme.id === id))
        .filter(
          (theme): theme is (typeof playgroundThemes)[number] =>
            Boolean(theme),
        ),
    [recentIds],
  );

  const inspected = getTheme(hoveredId ?? selected.id);

  const chooseTheme = (themeId: string) => {
    document.documentElement.dataset.playgroundThemeChanging = "true";

    window.setTimeout(() => {
      onChange(themeId);

      const next = [
        themeId,
        ...recentIds.filter((id) => id !== themeId),
      ].slice(0, MAX_RECENT);

      setRecentIds(next);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));

      window.setTimeout(() => {
        delete document.documentElement.dataset.playgroundThemeChanging;
      }, 180);
    }, 80);
  };

  const toggleFavorite = (
    event: MouseEvent<HTMLButtonElement>,
    themeId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const next = favoriteIds.includes(themeId)
      ? favoriteIds.filter((id) => id !== themeId)
      : [themeId, ...favoriteIds];

    setFavoriteIds(next);
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  const handleGridKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
        event.key,
      )
    ) {
      return;
    }

    event.preventDefault();

    const currentIndex = optionRefs.current.findIndex(
      (element) => element === document.activeElement,
    );

    if (currentIndex < 0) {
      optionRefs.current[0]?.focus();
      return;
    }

    const columns =
      window.innerWidth >= 1100 ? 3 : window.innerWidth >= 720 ? 2 : 1;

    const delta =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -columns
            : columns;

    const nextIndex = Math.min(
      visibleThemes.length - 1,
      Math.max(0, currentIndex + delta),
    );

    optionRefs.current[nextIndex]?.focus();
  };

  const renderCompactTheme = (
    theme: (typeof playgroundThemes)[number],
    label: "Favorite" | "Recent",
  ) => (
    <button
      key={theme.id}
      type="button"
      className="theme-selector__compact-card"
      onClick={() => chooseTheme(theme.id)}
      aria-pressed={theme.id === selected.id}
    >
      <span
        className="theme-selector__compact-swatch"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0 52%, ${theme.colors.accent} 52% 100%)`,
        }}
      />
      <span>
        <small>{label}</small>
        <strong>{theme.name}</strong>
      </span>
    </button>
  );

  return (
    <section className="theme-selector theme-selector--v2">
      <header className="theme-selector__header">
        <div>
          <p className="theme-selector__eyebrow">Profile experience</p>
          <h2>Choose a theme</h2>
        </div>

        <div className="theme-selector__selected">
          <span
            style={{ background: inspected.colors.accent }}
            aria-hidden="true"
          />
          <div>
            <small>Previewing</small>
            <strong>{inspected.name}</strong>
          </div>
        </div>
      </header>

      <div className="theme-selector__toolbar">
        <label className="theme-selector__search">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search themes, layouts, moods..."
          />
        </label>

        <div className="theme-selector__categories" aria-label="Theme categories">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={item === category ? "is-active" : ""}
              onClick={() => setCategory(item)}
              aria-pressed={item === category}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {(favoriteThemes.length > 0 || recentThemes.length > 0) && (
        <div className="theme-selector__quick-access">
          {favoriteThemes.length > 0 && (
            <div>
              <div className="theme-selector__section-title">
                <span>Favorites</span>
                <span>{favoriteThemes.length}</span>
              </div>
              <div className="theme-selector__compact-row">
                {favoriteThemes.map((theme) =>
                  renderCompactTheme(theme, "Favorite"),
                )}
              </div>
            </div>
          )}

          {recentThemes.length > 0 && (
            <div>
              <div className="theme-selector__section-title">
                <span>Recently used</span>
                <span>{recentThemes.length}</span>
              </div>
              <div className="theme-selector__compact-row">
                {recentThemes.map((theme) =>
                  renderCompactTheme(theme, "Recent"),
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className="theme-selector__grid"
        role="listbox"
        aria-label="Available profile themes"
        onKeyDown={handleGridKeyDown}
      >
        {visibleThemes.map((theme, index) => {
          const isSelected = theme.id === selected.id;
          const isFavorite = favoriteIds.includes(theme.id);

          return (
            <article
              key={theme.id}
              className={[
                "theme-selector__card",
                isSelected ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => setHoveredId(theme.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                "--preview-bg": theme.colors.background,
                "--preview-surface": theme.colors.surface,
                "--preview-fg": theme.colors.foreground,
                "--preview-muted": theme.colors.muted,
                "--preview-accent": theme.colors.accent,
                "--preview-border": theme.colors.border,
              } as React.CSSProperties}
            >
              <button
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                className="theme-selector__card-main"
                onClick={() => chooseTheme(theme.id)}
              >
                <span className="theme-selector__miniature" aria-hidden="true">
                  <span className="theme-selector__miniature-top" />
                  <span className="theme-selector__miniature-body">
                    <span className="theme-selector__miniature-profile">
                      {initials(theme.name)}
                    </span>
                    <span className="theme-selector__miniature-copy">
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
                  <span className="theme-selector__miniature-grid">
                    <i />
                    <i />
                    <i />
                  </span>
                </span>

                <span className="theme-selector__card-copy">
                  <span className="theme-selector__card-meta">
                    <small>{theme.category}</small>
                    <small>{theme.layout}</small>
                  </span>
                  <strong>{theme.name}</strong>
                  <span>{theme.description}</span>
                </span>
              </button>

              <button
                type="button"
                className={[
                  "theme-selector__favorite",
                  isFavorite ? "is-favorite" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={(event) => toggleFavorite(event, theme.id)}
                aria-label={
                  isFavorite
                    ? `Remove ${theme.name} from favorites`
                    : `Add ${theme.name} to favorites`
                }
                aria-pressed={isFavorite}
              >
                {isFavorite ? "★" : "☆"}
              </button>

              {isSelected && (
                <span className="theme-selector__active-badge">Current</span>
              )}
            </article>
          );
        })}
      </div>

      {visibleThemes.length === 0 && (
        <div className="theme-selector__empty">
          <strong>No themes found</strong>
          <span>Try another search or category.</span>
        </div>
      )}

      <footer className="theme-selector__footer">
        <span>{visibleThemes.length} themes shown</span>
        <span>{playgroundThemes.length} total</span>
      </footer>
    </section>
  );
}
