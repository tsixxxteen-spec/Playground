import { useEffect, useMemo, useState } from "react";
import { getWidget } from "./registry";
import { normalizeWidgetSettings } from "./types";
import type { WidgetInstance, WidgetSettings } from "./types";
import "./WidgetLayer.css";

type Props = { settings?: WidgetSettings };

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  return <><strong>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong><small>{now.toLocaleDateString([], { weekday: "long" })}</small></>;
}

function WidgetContent({ instance }: { instance: WidgetInstance }) {
  const now = useMemo(() => new Date(), []);
  if (instance.widgetId === "clock") return <LiveClock/>;
  if (instance.widgetId === "calendar") return <><small>{now.toLocaleDateString([], { month: "long", year: "numeric" })}</small><strong>{now.getDate()}</strong><em>{now.toLocaleDateString([], { weekday: "long" })}</em></>;
  if (instance.widgetId === "sticky-note") return <><small>{instance.title || "Note to self"}</small><p>{instance.content || "Make something worth remembering."}</p></>;
  if (instance.widgetId === "quote") return <blockquote>“{instance.content || "Build the world you want to enter."}”</blockquote>;
  if (instance.widgetId === "progress") return <><small>{instance.title || "Current chapter"}</small><strong>{instance.progress ?? 65}%</strong><span className="world-widget__progress"><i style={{ width: `${instance.progress ?? 65}%` }}/></span></>;
  return <><span className="world-widget__photo">✦</span><small>{instance.title || "Memory"}</small></>;
}

export default function WidgetLayer({ settings }: Props) {
  const value = normalizeWidgetSettings(settings);
  if (!value.enabled) return null;
  return <div className="world-widget-layer" aria-label="World widgets">{value.instances.filter((item) => item.enabled).map((item) => {
    const definition = getWidget(item.widgetId);
    return <article key={item.id} className="world-widget" data-widget={item.widgetId} style={{ left: `${item.position.x}%`, top: `${item.position.y}%`, width: `${item.size.width}%`, height: `${item.size.height}%`, zIndex: item.zIndex }} aria-label={definition.name}><WidgetContent instance={item}/></article>;
  })}</div>;
}
