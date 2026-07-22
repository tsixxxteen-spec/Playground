import { useMemo, useState } from "react";
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

const categories = [
  "All",
  ...Array.from(
    new Set(marketplaceCatalog.map((theme) => theme.category)),
  ).sort((a, b) => a.localeCompare(b)),
];

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
  const [selectedId, setSelectedId] = useState(activeThemeId);

  const visibleThemes = useMemo(() => {
    const filtered = marketplaceCatalog.filter((theme) => {
      const categoryMatch =
        category === "All" || theme.category === category;
      const tierMatch = tier === "All" || theme.tier === tier;

      return categoryMatch && tierMatch && matchesSearch(theme, query);
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

      return Number(b.featured) - Number(a.featured) ||
        a.name.localeCompare(b.name);
    });
  }, [category, query, sortMode, tier]);

  const selected =
    marketplaceCatalog.find((theme) => theme.id === selectedId) ??
    marketplaceCatalog[0];

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

      <section className="theme-marketplace__panel">
        <header className="theme-marketplace__header">
          <div>
            <p>Playground Marketplace</p>
            <h2>Discover profile worlds</h2>
          </div>

          <button
            className="theme-marketplace__close"
            type="button"
            onClick={onClose}
            aria-label="Close marketplace"
          >
            ×
          </button>
        </header>

        <div className="theme-marketplace__toolbar">
          <label>
            <span>Search marketplace</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search themes, styles, creators..."
              autoFocus
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

        <div className="theme-marketplace__body">
          <div className="theme-marketplace__catalog">
            <div className="theme-marketplace__summary">
              <span>{visibleThemes.length} themes</span>
              <span>{marketplaceCatalog.length} available</span>
            </div>

            <div className="theme-marketplace__grid">
              {visibleThemes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={[
                    "theme-marketplace__card",
                    selected?.id === theme.id ? "is-selected" : "",
                    activeThemeId === theme.id ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
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

                  {activeThemeId === theme.id && (
                    <em>Active</em>
                  )}
                </button>
              ))}
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

              <small className="theme-marketplace__foundation-note">
                Marketplace purchasing and creator uploads are prepared for
                a later backend sprint.
              </small>
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}
