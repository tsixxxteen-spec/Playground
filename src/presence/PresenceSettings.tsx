import type { PresenceMode } from "./PresenceTypes";
import { usePresence } from "./PresenceContext";

import "./Presence.css";

const modes: {
  value: PresenceMode;
  label: string;
  description: string;
}[] = [
  {
    value: "off",
    label: "Off",
    description: "Hide active explorers",
  },
  {
    value: "ambient",
    label: "Ambient",
    description: "Show anonymous drifting lights",
  },
  {
    value: "full",
    label: "Full",
    description: "Show explorer identity on hover",
  },
];

export default function PresenceSettings() {
  const {
    mode,
    setMode,
  } = usePresence();

  return (
    <div
      className="presence-settings"
      aria-label="Floating active explorers"
    >
      <span className="presence-settings__title">
        Active explorers
      </span>

      <div
        className="presence-settings__options"
        role="group"
        aria-label="Presence display mode"
      >
        {modes.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              mode === option.value
                ? "presence-settings__button is-active"
                : "presence-settings__button"
            }
            aria-pressed={mode === option.value}
            title={option.description}
            onClick={() => setMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
