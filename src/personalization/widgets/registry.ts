import type { WidgetKind } from "./types";

export type WidgetDefinition = {
  id: WidgetKind;
  name: string;
  description: string;
  glyph: string;
  defaultSize: { width: number; height: number };
  defaultTitle?: string;
  defaultContent?: string;
};

const widgets: WidgetDefinition[] = [
  { id: "clock", name: "Live Clock", description: "A quiet clock that updates with local time.", glyph: "◷", defaultSize: { width: 20, height: 15 } },
  { id: "calendar", name: "Calendar", description: "Today at a glance.", glyph: "▦", defaultSize: { width: 21, height: 17 } },
  { id: "sticky-note", name: "Sticky Note", description: "Leave a thought inside your World.", glyph: "▱", defaultSize: { width: 24, height: 20 }, defaultTitle: "Note to self", defaultContent: "Make something worth remembering." },
  { id: "quote", name: "Quote Card", description: "A line that sets the tone.", glyph: "“", defaultSize: { width: 27, height: 19 }, defaultContent: "Build the world you want to enter." },
  { id: "progress", name: "Progress", description: "A visual tracker for what matters.", glyph: "◒", defaultSize: { width: 26, height: 16 }, defaultTitle: "Current chapter" },
  { id: "photo-frame", name: "Photo Frame", description: "A luminous frame for visual atmosphere.", glyph: "▣", defaultSize: { width: 23, height: 25 }, defaultTitle: "Memory" },
];

export const listWidgets = (): WidgetDefinition[] => widgets.map((widget) => ({ ...widget, defaultSize: { ...widget.defaultSize } }));
export const getWidget = (id: WidgetKind): WidgetDefinition => widgets.find((widget) => widget.id === id) ?? widgets[0];
