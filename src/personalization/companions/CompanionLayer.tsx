import { useEffect, useMemo, useRef, useState } from "react";
import { getCompanion } from "./registry";
import { normalizeCompanionSettings } from "./types";
import type { CompanionBehavior, CompanionSettings } from "./types";
import "./CompanionLayer.css";

type Props = { settings?: CompanionSettings };
type Point = { x: number; y: number; direction: 1 | -1; state: "idle" | "move" | "react" };

function seededPoint(index: number, behavior: CompanionBehavior): Point {
  const upper = behavior === "dreamy" ? 58 : 78;
  return { x: 16 + ((index * 23) % 68), y: 24 + ((index * 19) % upper), direction: index % 2 ? -1 : 1, state: "idle" };
}

export default function CompanionLayer({ settings }: Props) {
  const value = normalizeCompanionSettings(settings);
  const definition = getCompanion(value.companionId);
  const [points, setPoints] = useState<Point[]>(() => Array.from({ length: value.quantity }, (_, index) => seededPoint(index, value.behavior)));
  const cursor = useRef({ x: 50, y: 50 });
  const reducedMotion = useMemo(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false, []);

  useEffect(() => {
    setPoints(Array.from({ length: value.quantity }, (_, index) => seededPoint(index, value.behavior)));
  }, [value.quantity, value.companionId, value.behavior]);

  useEffect(() => {
    if (!value.enabled || reducedMotion) return;
    const interval = window.setInterval(() => {
      setPoints((current) => current.map((point, index) => {
        if (value.followCursor) {
          const dx = cursor.current.x - point.x;
          const dy = cursor.current.y - point.y;
          const factor = .05 + value.speed / 1800;
          return { x: point.x + dx * factor, y: point.y + dy * factor, direction: dx < 0 ? -1 : 1, state: "move" };
        }
        const phase = Date.now() / (900 - value.speed * 4) + index * 1.7;
        const playful = value.behavior === "playful" ? 1.7 : value.behavior === "calm" ? .55 : 1;
        const dx = Math.cos(phase) * playful * (0.25 + value.speed / 180);
        const dy = Math.sin(phase * .73) * playful * (0.16 + value.speed / 260);
        const nextX = Math.max(6, Math.min(94, point.x + dx));
        const yMin = value.companionId === "bird" || value.companionId === "butterfly" || value.companionId === "ghost" || value.companionId === "robot" ? 14 : 58;
        const yMax = value.companionId === "bird" || value.companionId === "butterfly" || value.companionId === "ghost" || value.companionId === "robot" ? 82 : 88;
        const nextY = Math.max(yMin, Math.min(yMax, point.y + dy));
        return { x: nextX, y: nextY, direction: dx < 0 ? -1 : 1, state: "move" };
      }));
    }, 120);
    return () => window.clearInterval(interval);
  }, [reducedMotion, value.behavior, value.companionId, value.enabled, value.followCursor, value.speed]);

  useEffect(() => {
    if (!value.enabled || !value.followCursor) return;
    const handlePointer = (event: PointerEvent) => {
      cursor.current = { x: event.clientX / window.innerWidth * 100, y: event.clientY / window.innerHeight * 100 };
    };
    window.addEventListener("pointermove", handlePointer, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointer);
  }, [value.enabled, value.followCursor]);

  if (!value.enabled) return null;

  return <div className="companion-layer" aria-label={`${definition.name} companion`}>
    {points.map((point, index) => <button key={`${definition.id}-${index}`} type="button" className="companion-entity" data-kind={definition.id} data-state={point.state} style={{ left: `${point.x}%`, top: `${point.y}%`, transform: `translate(-50%,-50%) scale(${value.size / 100}) scaleX(${point.direction})`, "--companion-accent": definition.accent, "--companion-delay": `${index * -0.7}s` } as React.CSSProperties} onClick={() => {
      setPoints((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, state: "react", y: Math.max(10, item.y - 4) } : item));
      window.setTimeout(() => setPoints((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, state: "idle" } : item)), 650);
    }} aria-label={`Interact with ${definition.name}`}>
      <span className="companion-entity__shadow"/><span className="companion-entity__glow"/><span className="companion-entity__glyph" aria-hidden="true">{definition.glyph}</span><span className="companion-entity__spark" aria-hidden="true">✦</span>
    </button>)}
  </div>;
}
