import { useMemo, useState } from "react";
import { getWidget, listWidgets } from "./registry";
import { normalizeWidgetSettings } from "./types";
import type { WidgetInstance, WidgetKind, WidgetSettings } from "./types";
import "./WidgetStudio.css";

type Props = { value: WidgetSettings; onChange: (value: WidgetSettings) => void };

const newId = (kind: WidgetKind): string => `widget-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function WidgetStudio({ value, onChange }: Props) {
  const settings = useMemo(() => normalizeWidgetSettings(value), [value]);
  const [selectedId, setSelectedId] = useState<string | null>(settings.instances[0]?.id ?? null);
  const selected = settings.instances.find((instance) => instance.id === selectedId) ?? null;

  const commit = (instances: WidgetInstance[]) => onChange({ ...settings, instances });
  const update = (id: string, patch: Partial<WidgetInstance>) => commit(settings.instances.map((item) => item.id === id ? { ...item, ...patch } : item));
  const add = (kind: WidgetKind) => {
    const definition = getWidget(kind);
    const index = settings.instances.length;
    const instance: WidgetInstance = {
      id: newId(kind), widgetId: kind, enabled: true,
      position: { x: Math.min(76, 14 + (index * 9) % 58), y: Math.min(72, 16 + (index * 8) % 54) },
      size: definition.defaultSize, zIndex: 30 + index, locked: false,
      title: definition.defaultTitle, content: definition.defaultContent, progress: 65,
    };
    commit([...settings.instances, instance]);
    setSelectedId(instance.id);
  };
  const remove = (id: string) => { commit(settings.instances.filter((item) => item.id !== id)); setSelectedId(null); };
  const duplicate = (item: WidgetInstance) => {
    const copy = { ...item, id: newId(item.widgetId), position: { x: Math.min(90, item.position.x + 4), y: Math.min(90, item.position.y + 4) }, zIndex: Math.max(...settings.instances.map((widget) => widget.zIndex), 30) + 1 };
    commit([...settings.instances, copy]); setSelectedId(copy.id);
  };

  return <section className="widget-studio">
    <header className="widget-studio__hero"><div><span>LIVE PANELS</span><h4>Widgets</h4></div><label><input type="checkbox" checked={settings.enabled} onChange={(event) => onChange({ ...settings, enabled: event.target.checked })}/><span>Show widgets</span></label></header>
    <div className="widget-studio__catalog">{listWidgets().map((widget) => <button key={widget.id} type="button" onClick={() => add(widget.id)}><i>{widget.glyph}</i><span><strong>{widget.name}</strong><small>{widget.description}</small></span><b>＋</b></button>)}</div>
    <section className="widget-studio__installed"><header><span>IN YOUR WORLD</span><strong>{settings.instances.length} installed</strong></header>
      {settings.instances.length ? <div>{settings.instances.map((item) => { const definition = getWidget(item.widgetId); return <button key={item.id} type="button" data-active={selectedId === item.id} onClick={() => setSelectedId(item.id)}><i>{definition.glyph}</i><span><strong>{definition.name}</strong><small>{Math.round(item.position.x)}%, {Math.round(item.position.y)}%</small></span><em>{item.locked ? "Locked" : "Edit"}</em></button>; })}</div> : <p>Add a widget to begin building a live dashboard inside your World.</p>}
    </section>
    {selected ? <section className="widget-studio__inspector"><header><div><span>WIDGET INSPECTOR</span><h4>{getWidget(selected.widgetId).name}</h4></div><button type="button" onClick={() => remove(selected.id)}>Remove</button></header>
      <div className="widget-studio__toggle-row"><label><input type="checkbox" checked={selected.enabled} onChange={(event) => update(selected.id, { enabled: event.target.checked })}/><span>Visible</span></label><label><input type="checkbox" checked={selected.locked} onChange={(event) => update(selected.id, { locked: event.target.checked })}/><span>Lock</span></label></div>
      <div className="widget-studio__grid"><label><span>X position</span><input type="range" min="0" max="100" value={selected.position.x} disabled={selected.locked} onChange={(event) => update(selected.id, { position: { ...selected.position, x: Number(event.target.value) } })}/></label><label><span>Y position</span><input type="range" min="0" max="100" value={selected.position.y} disabled={selected.locked} onChange={(event) => update(selected.id, { position: { ...selected.position, y: Number(event.target.value) } })}/></label><label><span>Width</span><input type="range" min="10" max="60" value={selected.size.width} disabled={selected.locked} onChange={(event) => update(selected.id, { size: { ...selected.size, width: Number(event.target.value) } })}/></label><label><span>Height</span><input type="range" min="8" max="50" value={selected.size.height} disabled={selected.locked} onChange={(event) => update(selected.id, { size: { ...selected.size, height: Number(event.target.value) } })}/></label></div>
      {(selected.widgetId === "sticky-note" || selected.widgetId === "quote") ? <label className="widget-studio__text"><span>Content</span><textarea value={selected.content ?? ""} maxLength={300} onChange={(event) => update(selected.id, { content: event.target.value })}/></label> : null}
      {(selected.widgetId === "progress" || selected.widgetId === "sticky-note" || selected.widgetId === "photo-frame") ? <label className="widget-studio__text"><span>Title</span><input value={selected.title ?? ""} maxLength={80} onChange={(event) => update(selected.id, { title: event.target.value })}/></label> : null}
      {selected.widgetId === "progress" ? <label className="widget-studio__text"><span>Progress — {selected.progress ?? 65}%</span><input type="range" min="0" max="100" value={selected.progress ?? 65} onChange={(event) => update(selected.id, { progress: Number(event.target.value) })}/></label> : null}
      <footer><button type="button" onClick={() => duplicate(selected)}>Duplicate</button><button type="button" onClick={() => update(selected.id, { zIndex: selected.zIndex + 1 })}>Bring forward</button><button type="button" onClick={() => update(selected.id, { zIndex: Math.max(1, selected.zIndex - 1) })}>Send back</button></footer>
    </section> : null}
  </section>;
}
