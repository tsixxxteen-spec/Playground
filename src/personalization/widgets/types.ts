export type WidgetKind = "clock" | "calendar" | "sticky-note" | "quote" | "progress" | "photo-frame";

export type WidgetInstance = {
  id: string;
  widgetId: WidgetKind;
  enabled: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  locked: boolean;
  title?: string;
  content?: string;
  progress?: number;
};

export type WidgetSettings = {
  enabled: boolean;
  instances: WidgetInstance[];
};

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  enabled: true,
  instances: [],
};

const kinds: WidgetKind[] = ["clock", "calendar", "sticky-note", "quote", "progress", "photo-frame"];

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, number));
};

export function normalizeWidgetSettings(value?: Partial<WidgetSettings> | null): WidgetSettings {
  return {
    enabled: typeof value?.enabled === "boolean" ? value.enabled : true,
    instances: Array.isArray(value?.instances)
      ? value.instances.flatMap((raw, index) => {
          if (!raw || typeof raw !== "object") return [];
          const item = raw as Partial<WidgetInstance>;
          if (!kinds.includes(item.widgetId as WidgetKind)) return [];
          return [{
            id: typeof item.id === "string" && item.id ? item.id : `widget-${Date.now()}-${index}`,
            widgetId: item.widgetId as WidgetKind,
            enabled: typeof item.enabled === "boolean" ? item.enabled : true,
            position: {
              x: clamp(item.position?.x, 0, 100, 18 + index * 4),
              y: clamp(item.position?.y, 0, 100, 20 + index * 4),
            },
            size: {
              width: clamp(item.size?.width, 10, 60, 22),
              height: clamp(item.size?.height, 8, 50, 18),
            },
            zIndex: clamp(item.zIndex, 1, 999, index + 20),
            locked: Boolean(item.locked),
            title: typeof item.title === "string" ? item.title.slice(0, 80) : undefined,
            content: typeof item.content === "string" ? item.content.slice(0, 300) : undefined,
            progress: clamp(item.progress, 0, 100, 65),
          }];
        })
      : [],
  };
}
