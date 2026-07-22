import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PLAYGROUND_BUILD_METADATA,
} from "../build-metadata";
import {
  PLAYGROUND_RUNTIME_CONFIG,
} from "../runtime-config";
import {
  runPlaygroundReleaseChecks,
  type ReleaseCheck,
} from "./checks";

import "./release-center.css";

interface ReleaseCenterProps {
  systems: readonly string[];
}

function statusSymbol(status: ReleaseCheck["status"]): string {
  if (status === "pass") return "✓";
  if (status === "warning") return "!";
  return "×";
}

export default function ReleaseCenter({
  systems,
}: ReleaseCenterProps) {
  const [open, setOpen] = useState(false);
  const [runNumber, setRunNumber] = useState(0);

  const checks = useMemo(
    () =>
      runPlaygroundReleaseChecks({
        systems,
        config: PLAYGROUND_RUNTIME_CONFIG,
        metadata: PLAYGROUND_BUILD_METADATA,
      }),
    [systems, runNumber],
  );

  const failures = checks.filter(
    (item) => item.status === "fail",
  ).length;
  const warnings = checks.filter(
    (item) => item.status === "warning",
  ).length;
  const passes = checks.length - failures - warnings;
  const productionReady = failures === 0;

  const rerun = useCallback(() => {
    setRunNumber((value) => value + 1);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey;

      if (
        command &&
        event.shiftKey &&
        event.key.toLowerCase() === "l"
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () =>
      document.removeEventListener("keydown", onKeyDown);
  }, []);

  const exportReport = useCallback(() => {
    const report = {
      generatedAt: new Date().toISOString(),
      productionReady,
      summary: {
        passes,
        warnings,
        failures,
        total: checks.length,
      },
      metadata: PLAYGROUND_BUILD_METADATA,
      runtime: PLAYGROUND_RUNTIME_CONFIG,
      systems,
      checks,
    };

    const blob = new Blob(
      [JSON.stringify(report, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `playground-release-report-${Date.now()}.json`;
    anchor.click();

    URL.revokeObjectURL(url);
  }, [
    checks,
    failures,
    passes,
    productionReady,
    systems,
    warnings,
  ]);

  if (!open) {
    return (
      <button
        type="button"
        className="release-center-launcher"
        onClick={() => setOpen(true)}
        aria-label="Open Release Center"
        title="Release Center · ⌘⇧L"
      >
        RC
      </button>
    );
  }

  return (
    <section
      className="release-center"
      aria-label="Playground Release Center"
    >
      <header className="release-center__header">
        <div>
          <p className="release-center__eyebrow">
            Sprint 21B.15C
          </p>
          <h2>Release Center</h2>
          <p>
            {PLAYGROUND_BUILD_METADATA.version}
            {" · "}
            {PLAYGROUND_BUILD_METADATA.releaseChannel}
          </p>
        </div>

        <button
          type="button"
          className="release-center__close"
          onClick={() => setOpen(false)}
          aria-label="Close Release Center"
        >
          ×
        </button>
      </header>

      <div
        className={
          productionReady
            ? "release-center__verdict is-ready"
            : "release-center__verdict is-blocked"
        }
      >
        <strong>
          {productionReady
            ? "Production ready"
            : "Release blocked"}
        </strong>
        <span>
          {passes} passed · {warnings} warnings ·{" "}
          {failures} failed
        </span>
      </div>

      <div className="release-center__checks">
        {checks.map((item) => (
          <article
            key={item.id}
            className={`release-check is-${item.status}`}
          >
            <span
              className="release-check__symbol"
              aria-hidden="true"
            >
              {statusSymbol(item.status)}
            </span>
            <div>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </div>

      <footer className="release-center__footer">
        <button type="button" onClick={rerun}>
          Run checks again
        </button>
        <button type="button" onClick={exportReport}>
          Export report
        </button>
      </footer>
    </section>
  );
}
