import { useEffect, useRef } from "react";
import type { ParticleKind } from "./types";
import "./ParticleCanvas.css";

type Props = {
  kind: ParticleKind;
  intensity: number;
  speed: number;
  accent: string;
  enabled: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function createParticles(kind: ParticleKind, count: number, width: number, height: number): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = (index * 9301 + 49297) % 233280;
    const random = seed / 233280;
    const second = ((seed * 17 + 1013) % 233280) / 233280;
    const third = ((seed * 31 + 701) % 233280) / 233280;
    const falling = kind === "rain" || kind === "snow";
    const rising = kind === "embers" || kind === "dust";
    return {
      x: random * width,
      y: second * height,
      vx: kind === "rain" ? 1.4 + third * 1.8 : (third - 0.5) * (kind === "snow" ? 0.35 : 0.18),
      vy: kind === "rain" ? 8 + third * 7 : kind === "snow" ? 0.55 + third * 1.1 : rising ? -(0.18 + third * 0.55) : falling ? 0.6 : (third - 0.5) * 0.18,
      size: kind === "rain" ? 1 : kind === "stars" ? 0.8 + third * 1.7 : 1.5 + third * 4.2,
      alpha: 0.22 + random * 0.7,
      phase: random * Math.PI * 2,
    };
  });
}

export default function ParticleCanvas({ kind, intensity, speed, accent, enabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled || kind === "none") return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let particles: Particle[] = [];
    let width = 1;
    let height = 1;
    let lastTime = performance.now();
    let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rebuild = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const base = kind === "rain" ? 72 : kind === "snow" ? 56 : kind === "stars" ? 42 : 34;
      const count = Math.round(base + (clamp(intensity, 0, 100) / 100) * (kind === "rain" ? 170 : 95));
      particles = createParticles(kind, count, width, height);
    };

    const draw = (time: number) => {
      const delta = Math.min(2.4, (time - lastTime) / 16.6667);
      lastTime = time;
      context.clearRect(0, 0, width, height);
      const motion = reduceMotion ? 0 : 0.35 + clamp(speed, 0, 100) / 52;

      for (const particle of particles) {
        particle.phase += 0.012 * delta * motion;
        if (!reduceMotion) {
          particle.x += particle.vx * delta * motion;
          particle.y += particle.vy * delta * motion;
          if (kind === "snow") particle.x += Math.sin(particle.phase) * 0.45 * delta;
          if (kind === "fireflies") {
            particle.x += Math.cos(particle.phase * 0.8) * 0.28 * delta;
            particle.y += Math.sin(particle.phase) * 0.22 * delta;
          }
        }

        if (particle.y > height + 40) particle.y = -35;
        if (particle.y < -40) particle.y = height + 30;
        if (particle.x > width + 40) particle.x = -35;
        if (particle.x < -40) particle.x = width + 35;

        const pulse = kind === "fireflies" || kind === "stars" ? 0.35 + Math.sin(particle.phase * 2.2) * 0.3 : 1;
        context.save();
        context.globalAlpha = clamp(particle.alpha * pulse, 0.08, 1);

        if (kind === "rain") {
          const gradient = context.createLinearGradient(particle.x, particle.y - 26, particle.x, particle.y + 6);
          gradient.addColorStop(0, "rgba(190,225,255,0)");
          gradient.addColorStop(1, "rgba(190,225,255,0.92)");
          context.strokeStyle = gradient;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(particle.x, particle.y - 30);
          context.lineTo(particle.x + 4, particle.y + 8);
          context.stroke();
        } else {
          context.fillStyle = kind === "embers" ? "#ff7a22" : kind === "fireflies" ? accent : "rgba(255,255,255,0.95)";
          if (kind === "fireflies" || kind === "embers" || kind === "stars") {
            context.shadowBlur = kind === "stars" ? 9 : 16;
            context.shadowColor = kind === "embers" ? "#ff5a00" : accent;
          }
          context.beginPath();
          context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
      }

      animationFrame = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(rebuild);
    observer.observe(canvas);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotion = () => { reduceMotion = media.matches; };
    media.addEventListener?.("change", handleMotion);
    rebuild();
    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      media.removeEventListener?.("change", handleMotion);
    };
  }, [accent, enabled, intensity, kind, speed]);

  if (!enabled || kind === "none") return null;
  return <canvas ref={canvasRef} className={`world-particle-canvas world-particle-canvas--${kind}`} aria-hidden="true" />;
}
