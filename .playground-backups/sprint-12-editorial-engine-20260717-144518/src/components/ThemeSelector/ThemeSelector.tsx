import { getTheme, playgroundThemes } from "../../themes";
import "./ThemeSelector.css";

type Props = {
  value: string;
  onChange: (themeId: string) => void;
};

export default function ThemeSelector({ value, onChange }: Props) {
  const selected = getTheme(value);

  return (
    <section className="theme-selector">
      <header className="theme-selector__header">
        <div>
          <span>PROFILE THEME</span>
          <h3>{selected.name}</h3>
        </div>
        <p>{selected.description}</p>
      </header>

      <div className="theme-selector__grid" role="radiogroup">
        {playgroundThemes.map((theme) => (
          <button
            key={theme.id}
            className="theme-selector__option"
            type="button"
            role="radio"
            aria-checked={theme.id === selected.id}
            data-selected={theme.id === selected.id}
            onClick={() => onChange(theme.id)}
          >
            <span
              className="theme-selector__swatch"
              style={{
                background: theme.colors.background,
                color: theme.colors.foreground,
                borderColor: theme.colors.border,
              }}
            >
              <i style={{ background: theme.colors.accent }} />
              <b />
              <em style={{ background: theme.colors.accent }} />
              <small><u /><u /><u /></small>
            </span>
            <strong>{theme.name}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
