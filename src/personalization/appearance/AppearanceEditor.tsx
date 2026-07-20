import { useMemo, useState } from "react";
import ThemeSelector from "../../components/ThemeSelector";
import { createInstanceId } from "../../world/utils/createInstanceId";
import { normalizePlayground } from "../../world/types/playground";
import type { PlaygroundObjectInstance } from "../../world/types/playground";
import { ObjectBrowser } from "../objects/components";
import type { PersonalizationObjectDefinition } from "../objects";
import { EnvironmentStudio } from "../environments";
import { CompanionStudio } from "../companions";
import { WidgetStudio } from "../widgets";
import type { AppearanceTab, AppearanceValue } from "./types";
import "./AppearanceEditor.css";

type Props = { value: AppearanceValue; onChange: (value: AppearanceValue) => void; };
const tabs: Array<{id: AppearanceTab; label: string}> = [
  {id:"themes",label:"Themes"},{id:"decorations",label:"Decorations"},{id:"objects",label:"Objects"},{id:"companions",label:"Companions"},{id:"widgets",label:"Widgets"},{id:"effects",label:"Effects"},
];
export default function AppearanceEditor({ value, onChange }: Props) {
  const [tab, setTab] = useState<AppearanceTab>("themes");
  const playground = useMemo(() => normalizePlayground(value.playground), [value.playground]);
  const addObject = (definition: PersonalizationObjectDefinition) => {
    const count = playground.objects.length;
    const instance: PlaygroundObjectInstance = {
      id: createInstanceId(definition.id), objectId: definition.id, lane: definition.lane, enabled: true,
      position: { x: Math.min(86, 22 + ((count * 13) % 62)), y: Math.min(82, 24 + ((count * 11) % 54)) },
      rotation: ((count % 5) - 2) * 2, scale: definition.defaultScale ?? 1, zIndex: count + 1, action: definition.defaultAction,
    };
    onChange({ ...value, playground: { enabled: true, objects: [...playground.objects, instance] } });
  };
  const removeObject = (id: string) => onChange({ ...value, playground: { ...playground, objects: playground.objects.filter((object) => object.id !== id) } });
  return <section className="appearance-editor">
    <header className="appearance-editor__header"><div><span>APPEARANCE</span><h3>Shape your world</h3></div><p>Themes set the stage. Objects make it yours.</p></header>
    <nav className="appearance-editor__tabs" aria-label="Appearance sections">{tabs.map((item) => <button key={item.id} type="button" data-active={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    <div className="appearance-editor__body">
      {tab === "themes" ? <><ThemeSelector value={value.themeId} onChange={(themeId) => onChange({ ...value, themeId })} /><EnvironmentStudio value={value.environment} onChange={(environment) => onChange({ ...value, environment })}/></> : null}
      {tab === "objects" ? <><ObjectBrowser onAddObject={addObject}/><section className="appearance-editor__placed"><header><div><span>IN YOUR PLAYGROUND</span><h4>{playground.objects.length} placed object{playground.objects.length === 1 ? "" : "s"}</h4></div><label><input type="checkbox" checked={playground.enabled} onChange={(event) => onChange({ ...value, playground: { ...playground, enabled: event.target.checked } })}/><span>Show objects</span></label></header>{playground.objects.length ? <div className="appearance-editor__placed-list">{playground.objects.map((object) => <article key={object.id}><div><strong>{object.objectId.replace(/^personal-/,"").replace(/-/g," ")}</strong><small>{Math.round(object.position.x)}%, {Math.round(object.position.y)}%</small></div><button type="button" onClick={() => removeObject(object.id)}>Remove</button></article>)}</div> : <p>Add an object above to begin building your world.</p>}</section></> : null}
      {tab === "companions" ? <CompanionStudio value={value.companions} onChange={(companions) => onChange({ ...value, companions })}/> : null}
      {tab === "widgets" ? <WidgetStudio value={value.widgets} onChange={(widgets) => onChange({ ...value, widgets })}/> : null}
      {tab === "effects" ? <EnvironmentStudio mode="effects" value={value.environment} onChange={(environment) => onChange({ ...value, environment })}/> : null}
      {tab !== "themes" && tab !== "objects" && tab !== "companions" && tab !== "widgets" && tab !== "effects" ? <div className="appearance-editor__coming-soon"><span>{tab.toUpperCase()}</span><h4>Studio foundation ready</h4><p>This section is reserved for the next focused sprint.</p></div> : null}
    </div>
  </section>;
}
