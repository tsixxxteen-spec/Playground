import { getCompanion, listCompanions } from "./registry";
import { normalizeCompanionSettings } from "./types";
import type { CompanionBehavior, CompanionSettings } from "./types";
import "./CompanionStudio.css";

type Props = {
  value?: CompanionSettings;
  onChange: (value: CompanionSettings) => void;
};

const behaviors: Array<{ id: CompanionBehavior; label: string }> = [
  { id: "calm", label: "Calm" },
  { id: "curious", label: "Curious" },
  { id: "playful", label: "Playful" },
  { id: "dreamy", label: "Dreamy" },
];

export default function CompanionStudio({ value, onChange }: Props) {
  const settings = normalizeCompanionSettings(value);
  const selected = getCompanion(settings.companionId);
  const update = (patch: Partial<CompanionSettings>) => onChange(normalizeCompanionSettings({ ...settings, ...patch }));

  return <section className="companion-studio">
    <header className="companion-studio__hero">
      <div><span>COMPANION ENGINE</span><h4>Bring a friend into your world</h4><p>Companions wander, react, rest, and return every time your profile opens.</p></div>
      <label className="companion-studio__switch"><input type="checkbox" checked={settings.enabled} onChange={(event) => update({ enabled: event.target.checked })}/><span>{settings.enabled ? "Active" : "Off"}</span></label>
    </header>

    <div className="companion-studio__grid">
      {listCompanions().map((companion) => <button key={companion.id} type="button" className="companion-studio__card" data-active={settings.companionId === companion.id} onClick={() => update({ companionId: companion.id, behavior: companion.defaultBehavior, enabled: true })}>
        <span className="companion-studio__glyph" style={{ "--companion-accent": companion.accent } as React.CSSProperties}>{companion.glyph}</span>
        <strong>{companion.name}</strong><small>{companion.description}</small>
      </button>)}
    </div>

    <section className="companion-studio__controls">
      <header><div><span>CURRENT COMPANION</span><h5>{selected.name}</h5></div><div className="companion-studio__preview">{selected.glyph}</div></header>
      <div className="companion-studio__control-grid">
        <label><span>Quantity <b>{settings.quantity}</b></span><input type="range" min="1" max="4" step="1" value={settings.quantity} onChange={(event) => update({ quantity: Number(event.target.value) })}/></label>
        <label><span>Size <b>{settings.size}%</b></span><input type="range" min="60" max="160" step="5" value={settings.size} onChange={(event) => update({ size: Number(event.target.value) })}/></label>
        <label><span>Movement <b>{settings.speed}%</b></span><input type="range" min="10" max="100" step="5" value={settings.speed} onChange={(event) => update({ speed: Number(event.target.value) })}/></label>
        <label className="companion-studio__follow"><span>Follow cursor</span><input type="checkbox" checked={settings.followCursor} onChange={(event) => update({ followCursor: event.target.checked })}/></label>
      </div>
      <div className="companion-studio__behaviors" role="group" aria-label="Companion behavior">{behaviors.map((behavior) => <button key={behavior.id} type="button" data-active={settings.behavior === behavior.id} onClick={() => update({ behavior: behavior.id })}>{behavior.label}</button>)}</div>
    </section>
  </section>;
}
