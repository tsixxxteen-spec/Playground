import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  marketplaceCatalog,
  type MarketplaceTheme,
  type MarketplaceTier,
} from "./marketplaceCatalog";
import "./ThemeMarketplace.css";

type Props = {
  open: boolean;
  activeThemeId: string;
  onClose: () => void;
  onApplyTheme: (themeId: string) => void;
};

type SortMode = "Featured" | "Name" | "Newest";
type ViewMode = "grid" | "compact";
type LibraryFilter = "All" | "Saved" | "Installed";

const SAVED_KEY = "playground.marketplace.saved.v1";
const VIEW_KEY = "playground.marketplace.view.v1";

const categories = [
  "All",
  ...Array.from(
    new Set(marketplaceCatalog.map((theme) => theme.category)),
  ).sort((a, b) => a.localeCompare(b)),
];

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

function readViewMode(): ViewMode {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "compact"
      ? "compact"
      : "grid";
  } catch {
    return "grid";
  }
}

function matchesSearch(theme: MarketplaceTheme, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    theme.name,
    theme.description,
    theme.category,
    theme.creator,
    theme.tier,
    ...theme.tags,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export default function ThemeMarketplace({
  open,
  activeThemeId,
  onClose,
  onApplyTheme,
}: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [tier, setTier] = useState<MarketplaceTier | "All">("All");
  const [sortMode, setSortMode] = useState<SortMode>("Featured");
  const [libraryFilter, setLibraryFilter] =
    useState<LibraryFilter>("All");
  const [selectedId, setSelectedId] = useState(activeThemeId);
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    readStringArray(SAVED_KEY),
  );
  const [viewMode, setViewMode] = useState<ViewMode>(readViewMode);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setSelectedId(activeThemeId);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeThemeId, onClose, open]);

  const visibleThemes = useMemo(() => {
    const filtered = marketplaceCatalog.filter((theme) => {
      const categoryMatch =
        category === "All" || theme.category === category;
      const tierMatch = tier === "All" || theme.tier === tier;
      const libraryMatch =
        libraryFilter === "All" ||
        (libraryFilter === "Saved" && savedIds.includes(theme.id)) ||
        (libraryFilter === "Installed" && theme.status === "installed");

      return (
        categoryMatch &&
        tierMatch &&
        libraryMatch &&
        matchesSearch(theme, query)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "Name") {
        return a.name.localeCompare(b.name);
      }

      if (sortMode === "Newest") {
        return b.version.localeCompare(a.version, undefined, {
          numeric: true,
        });
      }

      return (
        Number(b.featured) - Number(a.featured) ||
        a.name.localeCompare(b.name)
      );
    });
  }, [category, libraryFilter, query, savedIds, sortMode, tier]);

  const selected =
    marketplaceCatalog.find((theme) => theme.id === selectedId) ??
    marketplaceCatalog[0];

  const savedThemes = marketplaceCatalog.filter((theme) =>
    savedIds.includes(theme.id),
  );

  const toggleSaved = (themeId: string) => {
    const next = savedIds.includes(themeId)
      ? savedIds.filter((id) => id !== themeId)
      : [themeId, ...savedIds];

    setSavedIds(next);
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  };

  const setMarketplaceView = (next: ViewMode) => {
    setViewMode(next);
    window.localStorage.setItem(VIEW_KEY, next);
  };

  const handleCatalogKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
        event.key,
      )
    ) {
      return;
    }

    const cards = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        ".theme-marketplace__card-main",
      ),
    );

    const currentIndex = cards.findIndex(
      (card) => card === document.activeElement,
    );

    if (currentIndex < 0) return;

    event.preventDefault();

    const columns =
      viewMode === "compact"
        ? 1
        : window.innerWidth >= 1120
          ? 3
          : window.innerWidth >= 760
            ? 2
            : 1;

    const delta =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -columns
            : columns;

    const nextIndex = Math.max(
      0,
      Math.min(cards.length - 1, currentIndex + delta),
    );

    cards[nextIndex]?.focus();
  };

  if (!open) return null;

  return (
    <div
      className="theme-marketplace"
      role="dialog"
      aria-modal="true"
      aria-label="Theme marketplace"
    >
      <button
        className="theme-marketplace__backdrop"
        type="button"
        aria-label="Close theme marketplace"
        onClick={onClose}
      />

      <section
        ref={panelRef}
        className="theme-marketplace__panel"
      >
        <header className="theme-marketplace__header">
          <div>
            <p>Playground Marketplace</p>
            <h2>Discover profile worlds</h2>
          </div>

          <div className="theme-marketplace__header-actions">
            <span>
              {savedIds.length} saved
            </span>
            <button
              ref={closeRef}
              className="theme-marketplace__close"
              type="button"
              onClick={onClose}
              aria-label="Close marketplace"
            >
              ×
            </button>
          </div>
        </header>

        <div className="theme-marketplace__toolbar">
          <label>
            <span>Search marketplace</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search themes, styles, creators..."
            />
          </label>

          <label>
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Access</span>
            <select
              value={tier}
              onChange={(event) =>
                setTier(event.target.value as MarketplaceTier | "All")
              }
            >
              <option>All</option>
              <option>Included</option>
              <option>Premium</option>
            </select>
          </label>

          <label>
            <span>Sort</span>
            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as SortMode)
              }
            >
              <option>Featured</option>
              <option>Name</option>
              <option>Newest</option>
            </select>
          </label>
        </div>

        <div className="theme-marketplace__subtoolbar">
          <div
            className="theme-marketplace__library-filter"
            aria-label="Marketplace library filter"
          >
            {(["All", "Saved", "Installed"] as LibraryFilter[]).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  className={libraryFilter === item ? "is-active" : ""}
                  onClick={() => setLibraryFilter(item)}
                  aria-pressed={libraryFilter === item}
                >
                  {item}
                  {item === "Saved" && savedIds.length > 0 && (
                    <span>{savedIds.length}</span>
                  )}
                </button>
              ),
            )}
          </div>

          <div
            className="theme-marketplace__view-toggle"
            aria-label="Marketplace view"
          >
            <button
              type="button"
              className={viewMode === "grid" ? "is-active" : ""}
              onClick={() => setMarketplaceView("grid")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              Grid
            </button>
            <button
              type="button"
              className={viewMode === "compact" ? "is-active" : ""}
              onClick={() => setMarketplaceView("compact")}
              aria-label="Compact view"
              aria-pressed={viewMode === "compact"}
            >
              List
            </button>
          </div>
        </div>

        <div className="theme-marketplace__body">
          <div className="theme-marketplace__catalog">
            <div className="theme-marketplace__summary">
              <span>{visibleThemes.length} themes</span>
              <span>{marketplaceCatalog.length} available</span>
            </div>

            <div
              className={`theme-marketplace__grid theme-marketplace__grid--${viewMode}`}
              onKeyDown={handleCatalogKeyDown}
            >
              {visibleThemes.map((theme) => {
                const isSaved = savedIds.includes(theme.id);

                return (
                  <article
                    key={theme.id}
                    className={[
                      "theme-marketplace__card",
                      selected?.id === theme.id ? "is-selected" : "",
                      activeThemeId === theme.id ? "is-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      className="theme-marketplace__card-main"
                      onClick={() => setSelectedId(theme.id)}
                    >
                      <span
                        className="theme-marketplace__preview"
                        style={{
                          "--market-bg": theme.preview.background,
                          "--market-surface": theme.preview.surface,
                          "--market-fg": theme.preview.foreground,
                          "--market-accent": theme.preview.accent,
                          "--market-border": theme.preview.border,
                        } as React.CSSProperties}
                      >
                        <i />
                        <strong>{theme.name.slice(0, 1)}</strong>
                        <span>
                          <i />
                          <i />
                          <i />
                        </span>
                      </span>

                      <span className="theme-marketplace__card-copy">
                        <span>
                          <small>{theme.category}</small>
                          <small>{theme.tier}</small>
                        </span>
                        <strong>{theme.name}</strong>
                        <small>by {theme.creator}</small>
                      </span>
                    </button>

                    <button
                      type="button"
                      className={[
                        "theme-marketplace__save",
                        isSaved ? "is-saved" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => toggleSaved(theme.id)}
                      aria-label={
                        isSaved
                          ? `Remove ${theme.name} from saved themes`
                          : `Save ${theme.name}`
                      }
                      aria-pressed={isSaved}
                    >
                      {isSaved ? "★" : "☆"}
                    </button>

                    {activeThemeId === theme.id && (
                      <em>Active</em>
                    )}
                  </article>
                );
              })}
            </div>

            {visibleThemes.length === 0 && (
              <div className="theme-marketplace__empty">
                <strong>No marketplace results</strong>
                <span>Try another search or filter.</span>
              </div>
            )}
          </div>

          {selected && (
            <aside className="theme-marketplace__details">
              <span
                className="theme-marketplace__hero-preview"
                style={{
                  "--market-bg": selected.preview.background,
                  "--market-surface": selected.preview.surface,
                  "--market-fg": selected.preview.foreground,
                  "--market-accent": selected.preview.accent,
                  "--market-border": selected.preview.border,
                } as React.CSSProperties}
              >
                <i />
                <strong>{selected.name}</strong>
                <span />
              </span>

              <div className="theme-marketplace__detail-heading">
                <div>
                  <small>{selected.category}</small>
                  <h3>{selected.name}</h3>
                </div>
                <span>{selected.tier}</span>
              </div>

              <p>{selected.description}</p>

              <dl>
                <div>
                  <dt>Creator</dt>
                  <dd>{selected.creator}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{selected.version}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>Installed</dd>
                </div>
              </dl>

              <div className="theme-marketplace__tags">
                {selected.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <div className="theme-marketplace__detail-actions">
                <button
                  className="theme-marketplace__save-detail"
                  type="button"
                  onClick={() => toggleSaved(selected.id)}
                >
                  {savedIds.includes(selected.id)
                    ? "Remove from saved"
                    : "Save for later"}
                </button>

                <button
                  className="theme-marketplace__apply"
                  type="button"
                  onClick={() => {
                    onApplyTheme(selected.id);
                    onClose();
                  }}
                  disabled={activeThemeId === selected.id}
                >
                  {activeThemeId === selected.id
                    ? "Currently active"
                    : "Apply theme"}
                </button>
              </div>

              {savedThemes.length > 0 && (
                <div className="theme-marketplace__saved-strip">
                  <span>Saved library</span>
                  <div>
                    {savedThemes.slice(0, 5).map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedId(theme.id)}
                        title={theme.name}
                        style={{
                          background: theme.preview.background,
                          color: theme.preview.accent,
                          borderColor: theme.preview.border,
                        }}
                      >
                        {theme.name.slice(0, 1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <small className="theme-marketplace__foundation-note">
                Purchasing, licensing, and creator uploads remain prepared
                for a later backend sprint.
              </small>
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}
