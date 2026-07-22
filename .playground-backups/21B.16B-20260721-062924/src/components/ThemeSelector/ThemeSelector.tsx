import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
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

const RECENT_EDITORIALS_KEY = "playground.editorials.recent.v1";
const MAX_RECENT_EDITORIALS = 3;

const categories: Array<EditorialCategory | "All"> = [
  "All",
  "Editorial",
  "Fashion",
  "Music",
  "Cinema",
  "Portfolio",
  "Archive",
];

function readRecentEditorials(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_EDITORIALS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default function ThemeSelector({ value, onChange }: Props) {
  const selected = getTheme(value);
  const [category, setCategory] =
    useState<EditorialCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>(readRecentEditorials);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleEditorials = useMemo(() => {
    return playgroundThemes.filter((editorial) => {
      const matchesCategory =
        category === "All" || editorial.category === category;

      const searchableText = [
        editorial.name,
        editorial.category,
        editorial.description,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        normalizedQuery.length === 0 ||
        searchableText.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, normalizedQuery]);

  const featuredEditorials = useMemo(
    () => playgroundThemes.filter((editorial) => editorial.featured),
    [],
  );

  const recentEditorials = useMemo(
    () =>
      recentIds
        .map((id) => playgroundThemes.find((editorial) => editorial.id === id))
        .filter((editorial): editorial is (typeof playgroundThemes)[number] =>
          Boolean(editorial),
        ),
    [recentIds],
  );

  const inspected = getTheme(hoveredId ?? selected.id);

  const chooseEditorial = (editorialId: string) => {
    onChange(editorialId);

    const nextRecentIds = [
      editorialId,
      ...recentIds.filter((id) => id !== editorialId),
    ].slice(0, MAX_RECENT_EDITORIALS);

    setRecentIds(nextRecentIds);
    window.localStorage.setItem(
      RECENT_EDITORIALS_KEY,
      JSON.stringify(nextRecentIds),
    );
  };

  const handleGridKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }

    const currentIndex = optionRefs.current.findIndex(
      (element) => element === document.activeElement,
    );

    if (currentIndex < 0 || visibleEditorials.length === 0) {
      return;
    }

    event.preventDefault();

    const computedColumns =
      window.innerWidth <= 420 ? 1 : window.innerWidth <= 760 ? 2 : 3;
    const delta =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -computedColumns
            : computedColumns;

    const nextIndex = Math.min(
      visibleEditorials.length - 1,
      Math.max(0, currentIndex + delta),
    );

    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <section className="theme-selector">
      <header className="theme-selector__header">
        <div>
          <span>EDITORIAL</span>
          <h3>{inspected.name}</h3>
        </div>
        <p>{inspected.description}</p>
      </header>

      <label className="theme-selector__search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search editorials"
          aria-label="Search editorials"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")}>
            Clear
          </button>
        )}
      </label>

      <nav
        className="theme-selector__filters"
        aria-label="Editorial categories"
      >
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            data-active={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      {category === "All" && normalizedQuery.length === 0 && (
        <>
          <section className="theme-selector__collection">
            <header>
              <span>FEATURED</span>
              <small>{featuredEditorials.length} editorials</small>
            </header>

            <div className="theme-selector__featured-row">
              {featuredEditorials.map((editorial) => (
                <button
                  key={editorial.id}
                  type="button"
                  data-selected={editorial.id === selected.id}
                  onMouseEnter={() => setHoveredId(editorial.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(editorial.id)}
                  onBlur={() => setHoveredId(null)}
                  onClick={() => chooseEditorial(editorial.id)}
                >
                  <span
                    style={{
                      background: editorial.colors.background,
                      color: editorial.colors.foreground,
                      borderColor: editorial.colors.border,
                      fontFamily: editorial.headingFont,
                    }}
                  >
                    <small>{editorial.category}</small>
                    <strong>{editorial.name}</strong>
                    <i
                      style={{ background: editorial.colors.accent }}
                      aria-hidden="true"
                    />
                  </span>
                </button>
              ))}
            </div>
          </section>

          {recentEditorials.length > 0 && (
            <section className="theme-selector__collection">
              <header>
                <span>RECENTLY USED</span>
                <small>Stored on this device</small>
              </header>

              <div className="theme-selector__recent-row">
                {recentEditorials.map((editorial) => (
                  <button
                    key={editorial.id}
                    type="button"
                    data-selected={editorial.id === selected.id}
                    onMouseEnter={() => setHoveredId(editorial.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setHoveredId(editorial.id)}
                    onBlur={() => setHoveredId(null)}
                    onClick={() => chooseEditorial(editorial.id)}
                  >
                    <i style={{ background: editorial.colors.accent }} />
                    <span>
                      <strong>{editorial.name}</strong>
                      <small>{editorial.category}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="theme-selector__collection">
        <header>
          <span>{normalizedQuery ? "SEARCH RESULTS" : category}</span>
          <small>
            {visibleEditorials.length} {visibleEditorials.length === 1 ? "editorial" : "editorials"}
          </small>
        </header>

        {visibleEditorials.length > 0 ? (
          <div
            className="theme-selector__grid"
            role="radiogroup"
            onKeyDown={handleGridKeyDown}
          >
            {visibleEditorials.map((editorial, index) => (
              <button
                key={editorial.id}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                className="theme-selector__option"
                type="button"
                role="radio"
                aria-checked={editorial.id === selected.id}
                data-selected={editorial.id === selected.id}
                onMouseEnter={() => setHoveredId(editorial.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(editorial.id)}
                onBlur={() => setHoveredId(null)}
                onClick={() => chooseEditorial(editorial.id)}
              >
                <span
                  className="theme-selector__preview"
                  style={{
                    background: editorial.colors.background,
                    color: editorial.colors.foreground,
                    borderColor: editorial.colors.border,
                    fontFamily: editorial.headingFont,
                  }}
                >
                  <span className="theme-selector__preview-kicker">
                    {editorial.category}
                  </span>
                  <strong>{editorial.name}</strong>
                  <i
                    style={{ background: editorial.colors.accent }}
                    aria-hidden="true"
                  />
                  <small aria-hidden="true">
                    <b />
                    <b />
                    <b />
                  </small>
                </span>

                <span className="theme-selector__meta">
                  <span>
                    <strong>{editorial.name}</strong>
                    <small>{editorial.category}</small>
                  </span>
                  {editorial.featured && <em>Featured</em>}
                </span>

                <span className="theme-selector__description">
                  {editorial.description}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="theme-selector__empty">
            <strong>No editorials found.</strong>
            <span>Try another search or category.</span>
          </div>
        )}
      </section>
    </section>
  );
}
