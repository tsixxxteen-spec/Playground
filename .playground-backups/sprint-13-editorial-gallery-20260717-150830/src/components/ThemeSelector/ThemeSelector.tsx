import { useMemo, useState } from "react";
import { getTheme, playgroundThemes, type EditorialCategory } from "../../themes";
import "./ThemeSelector.css";

type Props = { value: string; onChange: (themeId: string) => void };
const categories: Array<EditorialCategory | "All"> = ["All", "Editorial", "Fashion", "Music", "Cinema", "Portfolio", "Archive"];

export default function ThemeSelector({ value, onChange }: Props) {
  const selected = getTheme(value);
  const [category, setCategory] = useState<EditorialCategory | "All">("All");
  const visibleEditorials = useMemo(
    () => category === "All" ? playgroundThemes : playgroundThemes.filter((editorial) => editorial.category === category),
    [category],
  );

  return (
    <section className="theme-selector">
      <header className="theme-selector__header">
        <div><span>EDITORIAL</span><h3>{selected.name}</h3></div>
        <p>{selected.description}</p>
      </header>

      <nav className="theme-selector__filters" aria-label="Editorial categories">
        {categories.map((item) => (
          <button key={item} type="button" data-active={category === item} onClick={() => setCategory(item)}>{item}</button>
        ))}
      </nav>

      <div className="theme-selector__grid" role="radiogroup">
        {visibleEditorials.map((editorial) => (
          <button
            key={editorial.id}
            className="theme-selector__option"
            type="button"
            role="radio"
            aria-checked={editorial.id === selected.id}
            data-selected={editorial.id === selected.id}
            onClick={() => onChange(editorial.id)}
          >
            <span className="theme-selector__preview" style={{ background: editorial.colors.background, color: editorial.colors.foreground, borderColor: editorial.colors.border, fontFamily: editorial.headingFont }}>
              <span className="theme-selector__preview-kicker">{editorial.category}</span>
              <strong>{editorial.name}</strong>
              <i style={{ background: editorial.colors.accent }} aria-hidden="true" />
              <small aria-hidden="true"><b /><b /><b /></small>
            </span>
            <span className="theme-selector__meta">
              <span><strong>{editorial.name}</strong><small>{editorial.category}</small></span>
              {editorial.featured && <em>Featured</em>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
