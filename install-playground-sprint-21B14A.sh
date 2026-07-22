#!/usr/bin/env bash

set -euo pipefail

SPRINT_ID="21B.14A"
MARKER=".playground-sprint-21B14A-installed"
BACKUP_DIR=".playground-backups/sprint-21B14A-$(date +%Y%m%d-%H%M%S)"

fail() {
  echo "❌ $*" >&2
  exit 1
}

[[ -f package.json ]] ||
  fail "Run this installer from the worlds project root."

[[ -f src/main.tsx ]] ||
  fail "src/main.tsx was not found."

[[ -f src/collaboration/command-center/CollaborationCommandCenter.tsx ]] ||
  fail "The Workspace Command Center was not found."

if [[ -f "$MARKER" ]]; then
  echo "✅ Sprint $SPRINT_ID is already installed."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
mkdir -p src/profile-experience/polish

FILES_TO_BACK_UP=(
  "src/main.tsx"
)

for file in "${FILES_TO_BACK_UP[@]}"; do
  mkdir -p "$BACKUP_DIR/$(dirname "$file")"
  cp -p "$file" "$BACKUP_DIR/$file"
done

rollback() {
  code=$?

  if [[ $code -ne 0 ]]; then
    echo ""
    echo "⚠️ Installation failed. Restoring previous files..."

    for file in "${FILES_TO_BACK_UP[@]}"; do
      if [[ -f "$BACKUP_DIR/$file" ]]; then
        cp -p "$BACKUP_DIR/$file" "$file"
      fi
    done

    rm -rf src/profile-experience/polish
    rm -f "$MARKER"

    echo "✅ Rollback complete."
  fi

  exit "$code"
}

trap rollback EXIT

# ------------------------------------------------------------
# Profile polish selectors
# ------------------------------------------------------------

cat > src/profile-experience/polish/profilePolishSelectors.ts <<'EOF'
export const PROFILE_ROOT_SELECTORS = [
  "[data-profile-page]",
  "[data-profile-root]",
  "[data-world-profile]",
  ".profile-page",
  ".profile-root",
  ".world-profile",
  ".playground-profile",
  ".profile-experience",
];

export const PROFILE_HEADER_SELECTORS = [
  "[data-profile-header]",
  "[data-world-header]",
  ".profile-header",
  ".world-header",
  ".profile-hero",
  ".world-profile-header",
  ".profile-cover",
  ".profile-banner",
];

export const BIO_CANVAS_SELECTORS = [
  "[data-profile-bio]",
  "[data-bio-canvas]",
  "[data-profile-canvas]",
  ".profile-bio",
  ".bio-canvas",
  ".profile-canvas",
  ".world-bio",
  ".profile-about",
];

export const COMPANION_SELECTORS = [
  "[data-companion]",
  "[data-profile-companion]",
  "[data-object-type='companion']",
  ".companion",
  ".profile-companion",
  ".world-companion",
  ".animated-companion",
];

export const COMPANION_MEDIA_SELECTORS = [
  "[data-companion] img",
  "[data-companion] video",
  "[data-profile-companion] img",
  "[data-profile-companion] video",
  "[data-object-type='companion'] img",
  "[data-object-type='companion'] video",
  ".companion img",
  ".companion video",
  ".profile-companion img",
  ".profile-companion video",
  ".world-companion img",
  ".world-companion video",
];

export const MOVABLE_OBJECT_SELECTORS = [
  "[data-profile-object]",
  "[data-world-object]",
  "[data-widget]",
  "[data-object-type]",
  ".profile-object",
  ".world-object",
  ".profile-widget",
  ".world-widget",
  ".widget-object",
];

export const EFFECT_SELECTORS = [
  "[data-profile-effect]",
  "[data-world-effect]",
  "[data-rain-effect]",
  "[data-snow-effect]",
  "[data-particle-effect]",
  ".profile-effect",
  ".world-effect",
  ".rain-effect",
  ".snow-effect",
  ".particle-effect",
  ".weather-effect",
  ".ambient-effect",
  ".profile-rain",
  ".world-rain",
];

export const ACTIVE_EXPLORERS_SELECTORS = [
  "[data-active-explorers]",
  ".active-explorers",
  ".active-explorers-toggle",
  ".explorers-toggle",
  ".world-explorers",
];

export const LEGACY_WORKSPACE_LAUNCHER_SELECTORS = [
  ".playground-session-launcher",
  ".playground-history-launcher",
  ".playground-session-controls-launcher",
  ".playground-session-controls",
  "[data-session-launcher]",
  "[data-history-launcher]",
  "[data-session-controls]",
];
EOF

# ------------------------------------------------------------
# Profile polish utilities
# ------------------------------------------------------------

cat > src/profile-experience/polish/profilePolishRuntime.ts <<'EOF'
import {
  ACTIVE_EXPLORERS_SELECTORS,
  BIO_CANVAS_SELECTORS,
  COMPANION_MEDIA_SELECTORS,
  COMPANION_SELECTORS,
  EFFECT_SELECTORS,
  LEGACY_WORKSPACE_LAUNCHER_SELECTORS,
  MOVABLE_OBJECT_SELECTORS,
  PROFILE_HEADER_SELECTORS,
  PROFILE_ROOT_SELECTORS,
} from "./profilePolishSelectors";

type ElementLike =
  HTMLElement | null;

function findFirst(
  selectors: string[],
  root: ParentNode = document,
): HTMLElement | null {
  for (const selector of selectors) {
    const element =
      root.querySelector<HTMLElement>(
        selector,
      );

    if (element) {
      return element;
    }
  }

  return null;
}

function findAll(
  selectors: string[],
  root: ParentNode = document,
): HTMLElement[] {
  const elements =
    new Set<HTMLElement>();

  selectors.forEach(
    (selector) => {
      root
        .querySelectorAll<HTMLElement>(
          selector,
        )
        .forEach(
          (element) => {
            elements.add(
              element,
            );
          },
        );
    },
  );

  return Array.from(
    elements,
  );
}

function addClass(
  element: ElementLike,
  className: string,
): void {
  if (!element) {
    return;
  }

  element.classList.add(
    className,
  );
}

function markProfileRoot(
  profileRoot: HTMLElement,
): void {
  addClass(
    profileRoot,
    "playground-polished-profile",
  );

  profileRoot.setAttribute(
    "data-playground-profile-polished",
    "true",
  );
}

function markBioCanvas(
  profileRoot: HTMLElement,
): HTMLElement {
  const existingCanvas =
    findFirst(
      BIO_CANVAS_SELECTORS,
      profileRoot,
    );

  const canvas =
    existingCanvas ??
    profileRoot;

  addClass(
    canvas,
    "playground-profile-bio-canvas",
  );

  canvas.setAttribute(
    "data-playground-bio-canvas",
    "true",
  );

  return canvas;
}

function hideLegacyHeaders(
  profileRoot: HTMLElement,
): void {
  findAll(
    PROFILE_HEADER_SELECTORS,
    profileRoot,
  ).forEach(
    (header) => {
      header.classList.add(
        "playground-profile-header-removed",
      );

      header.setAttribute(
        "aria-hidden",
        "true",
      );
    },
  );
}

function polishCompanions(
  canvas: HTMLElement,
): void {
  findAll(
    COMPANION_SELECTORS,
    canvas,
  ).forEach(
    (companion) => {
      companion.classList.add(
        "playground-polished-companion",
      );

      companion.setAttribute(
        "data-playground-bounded-companion",
        "true",
      );

      const computed =
        window.getComputedStyle(
          companion,
        );

      if (
        computed.position ===
        "static"
      ) {
        companion.style.position =
          "absolute";
      }
    },
  );

  findAll(
    COMPANION_MEDIA_SELECTORS,
    canvas,
  ).forEach(
    (media) => {
      media.classList.add(
        "playground-polished-companion-media",
      );

      media.setAttribute(
        "draggable",
        "false",
      );
    },
  );
}

function polishMovableObjects(
  canvas: HTMLElement,
): void {
  findAll(
    MOVABLE_OBJECT_SELECTORS,
    canvas,
  ).forEach(
    (object) => {
      object.classList.add(
        "playground-polished-profile-object",
      );
    },
  );
}

function expandEffects(
  profileRoot: HTMLElement,
): void {
  findAll(
    EFFECT_SELECTORS,
    profileRoot,
  ).forEach(
    (effect) => {
      effect.classList.add(
        "playground-full-page-effect",
      );

      effect.setAttribute(
        "aria-hidden",
        "true",
      );
    },
  );
}

function concealLegacyWorkspaceControls():
  void {
  findAll(
    LEGACY_WORKSPACE_LAUNCHER_SELECTORS,
  ).forEach(
    (launcher) => {
      launcher.classList.add(
        "playground-discreet-workspace-control",
      );

      launcher.setAttribute(
        "aria-hidden",
        "true",
      );
    },
  );
}

function protectActiveExplorers():
  void {
  findAll(
    ACTIVE_EXPLORERS_SELECTORS,
  ).forEach(
    (element) => {
      element.classList.add(
        "playground-active-explorers-safe-zone",
      );
    },
  );
}

function positionWorkspaceLauncher():
  void {
  const launcher =
    document.querySelector<HTMLElement>(
      ".playground-command-center-launcher",
    );

  if (!launcher) {
    return;
  }

  launcher.classList.add(
    "playground-command-center-launcher--discreet",
  );

  launcher.setAttribute(
    "data-playground-discreet-launcher",
    "true",
  );
}

function clampValue(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

function constrainCompanion(
  companion: HTMLElement,
  canvas: HTMLElement,
): void {
  const companionRect =
    companion.getBoundingClientRect();

  const canvasRect =
    canvas.getBoundingClientRect();

  if (
    canvasRect.width <= 0 ||
    canvasRect.height <= 0
  ) {
    return;
  }

  const currentLeft =
    companionRect.left -
    canvasRect.left;

  const currentTop =
    companionRect.top -
    canvasRect.top;

  const maximumLeft =
    Math.max(
      0,
      canvasRect.width -
        companionRect.width,
    );

  const maximumTop =
    Math.max(
      0,
      canvasRect.height -
        companionRect.height,
    );

  const clampedLeft =
    Math.round(
      clampValue(
        currentLeft,
        0,
        maximumLeft,
      ),
    );

  const clampedTop =
    Math.round(
      clampValue(
        currentTop,
        0,
        maximumTop,
      ),
    );

  const deltaX =
    clampedLeft -
    currentLeft;

  const deltaY =
    clampedTop -
    currentTop;

  if (
    Math.abs(deltaX) <
      0.5 &&
    Math.abs(deltaY) <
      0.5
  ) {
    return;
  }

  const previousCorrectionX =
    Number(
      companion.dataset
        .playgroundCorrectionX ??
        "0",
    );

  const previousCorrectionY =
    Number(
      companion.dataset
        .playgroundCorrectionY ??
        "0",
    );

  const nextCorrectionX =
    Math.round(
      previousCorrectionX +
      deltaX,
    );

  const nextCorrectionY =
    Math.round(
      previousCorrectionY +
      deltaY,
    );

  companion.dataset
    .playgroundCorrectionX =
      String(
        nextCorrectionX,
      );

  companion.dataset
    .playgroundCorrectionY =
      String(
        nextCorrectionY,
      );

  companion.style.setProperty(
    "--playground-companion-correction-x",
    `${nextCorrectionX}px`,
  );

  companion.style.setProperty(
    "--playground-companion-correction-y",
    `${nextCorrectionY}px`,
  );
}

function constrainAllCompanions(
  canvas: HTMLElement,
): void {
  findAll(
    COMPANION_SELECTORS,
    canvas,
  ).forEach(
    (companion) => {
      constrainCompanion(
        companion,
        canvas,
      );
    },
  );
}

export type ProfilePolishRuntime =
  {
    refresh: () => void;
    destroy: () => void;
  };

export function createProfilePolishRuntime():
  ProfilePolishRuntime {
  let profileRoot:
    HTMLElement | null = null;

  let canvas:
    HTMLElement | null = null;

  let animationFrame = 0;

  let resizeObserver:
    ResizeObserver | null =
      null;

  const refresh =
    () => {
      profileRoot =
        findFirst(
          PROFILE_ROOT_SELECTORS,
        );

      if (!profileRoot) {
        return;
      }

      markProfileRoot(
        profileRoot,
      );

      hideLegacyHeaders(
        profileRoot,
      );

      canvas =
        markBioCanvas(
          profileRoot,
        );

      polishCompanions(
        canvas,
      );

      polishMovableObjects(
        canvas,
      );

      expandEffects(
        profileRoot,
      );

      concealLegacyWorkspaceControls();
      protectActiveExplorers();
      positionWorkspaceLauncher();

      if (animationFrame) {
        window.cancelAnimationFrame(
          animationFrame,
        );
      }

      animationFrame =
        window.requestAnimationFrame(
          () => {
            if (canvas) {
              constrainAllCompanions(
                canvas,
              );
            }
          },
        );

      if (
        resizeObserver &&
        canvas
      ) {
        resizeObserver.disconnect();

        resizeObserver.observe(
          canvas,
        );
      }
    };

  const mutationObserver =
    new MutationObserver(
      () => {
        refresh();
      },
    );

  mutationObserver.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "data-profile-page",
        "data-profile-root",
        "data-profile-object",
        "data-profile-effect",
        "data-companion",
      ],
    },
  );

  if (
    typeof ResizeObserver !==
    "undefined"
  ) {
    resizeObserver =
      new ResizeObserver(
        () => {
          if (canvas) {
            constrainAllCompanions(
              canvas,
            );
          }
        },
      );
  }

  const handleWindowResize =
    () => {
      if (canvas) {
        constrainAllCompanions(
          canvas,
        );
      }

      positionWorkspaceLauncher();
    };

  const handleCompanionMoved =
    () => {
      if (canvas) {
        constrainAllCompanions(
          canvas,
        );
      }
    };

  window.addEventListener(
    "resize",
    handleWindowResize,
  );

  document.addEventListener(
    "playground:companion-moved",
    handleCompanionMoved,
  );

  document.addEventListener(
    "playground:objects-changed",
    refresh,
  );

  refresh();

  return {
    refresh,

    destroy: () => {
      mutationObserver.disconnect();

      resizeObserver?.disconnect();

      window.removeEventListener(
        "resize",
        handleWindowResize,
      );

      document.removeEventListener(
        "playground:companion-moved",
        handleCompanionMoved,
      );

      document.removeEventListener(
        "playground:objects-changed",
        refresh,
      );

      if (animationFrame) {
        window.cancelAnimationFrame(
          animationFrame,
        );
      }
    },
  };
}
EOF

# ------------------------------------------------------------
# React runtime bridge
# ------------------------------------------------------------

cat > src/profile-experience/polish/ProfileExperiencePolishBridge.tsx <<'EOF'
import {
  useEffect,
} from "react";

import {
  createProfilePolishRuntime,
} from "./profilePolishRuntime";

import "./profile-experience-polish.css";

export default function ProfileExperiencePolishBridge() {
  useEffect(() => {
    const runtime =
      createProfilePolishRuntime();

    document.dispatchEvent(
      new CustomEvent(
        "playground:profile-polish-ready",
      ),
    );

    return () => {
      runtime.destroy();
    };
  }, []);

  return null;
}
EOF

# ------------------------------------------------------------
# Profile polish styling
# ------------------------------------------------------------

cat > src/profile-experience/polish/profile-experience-polish.css <<'EOF'
/* ---------------------------------------------------------
   Profile root and continuous creative canvas
   --------------------------------------------------------- */

.playground-polished-profile {
  position: relative !important;
  min-height: 100%;
  overflow-x: clip;
  isolation: isolate;
}

.playground-profile-header-removed {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

.playground-profile-bio-canvas {
  position: relative !important;
  min-height:
    max(
      720px,
      100vh
    );
  width: 100%;
  overflow: hidden;
  isolation: isolate;
  contain:
    layout paint;
}

/* ---------------------------------------------------------
   Widgets and profile objects
   --------------------------------------------------------- */

.playground-polished-profile-object {
  position: relative;
  z-index: 5;
  max-width: 100%;
}

.playground-profile-bio-canvas
[data-profile-object],
.playground-profile-bio-canvas
[data-world-object],
.playground-profile-bio-canvas
[data-widget],
.playground-profile-bio-canvas
.profile-object,
.playground-profile-bio-canvas
.world-object,
.playground-profile-bio-canvas
.profile-widget,
.playground-profile-bio-canvas
.world-widget {
  box-sizing:
    border-box;
}

/* ---------------------------------------------------------
   Companions
   --------------------------------------------------------- */

.playground-polished-companion {
  z-index: 7;
  overflow: visible !important;
  border: 0 !important;
  outline: 0 !important;
  background:
    transparent !important;
  background-color:
    transparent !important;
  background-image:
    none !important;
  box-shadow:
    none !important;
  filter:
    none !important;
  backdrop-filter:
    none !important;
  mix-blend-mode:
    normal;
  isolation:
    isolate;
  transform:
    translate3d(
      var(
        --playground-companion-correction-x,
        0px
      ),
      var(
        --playground-companion-correction-y,
        0px
      ),
      0
    );
  transform-origin:
    center center;
  will-change:
    transform;
  backface-visibility:
    hidden;
  -webkit-backface-visibility:
    hidden;
  perspective:
    1000px;
  -webkit-perspective:
    1000px;
  image-rendering:
    auto;
}

.playground-polished-companion::before,
.playground-polished-companion::after {
  background:
    transparent !important;
  box-shadow:
    none !important;
  filter:
    none !important;
  backdrop-filter:
    none !important;
}

.playground-polished-companion-media {
  display: block;
  max-width: 100%;
  border: 0 !important;
  outline: 0 !important;
  background:
    transparent !important;
  background-color:
    transparent !important;
  box-shadow:
    none !important;
  filter:
    none !important;
  backdrop-filter:
    none !important;
  opacity: 1;
  transform:
    translateZ(0);
  will-change:
    transform;
  backface-visibility:
    hidden;
  -webkit-backface-visibility:
    hidden;
  object-fit:
    contain;
  pointer-events:
    none;
  user-select:
    none;
  -webkit-user-drag:
    none;
}

/*
  Prevent browser interpolation from creating faint matte rectangles
  around animated transparent images.
*/

.playground-polished-companion img,
.playground-polished-companion picture,
.playground-polished-companion canvas,
.playground-polished-companion video {
  background:
    transparent !important;
  box-shadow:
    none !important;
  filter:
    none !important;
  transform:
    translate3d(
      0,
      0,
      0
    );
}

/* ---------------------------------------------------------
   Full-page environmental effects
   --------------------------------------------------------- */

.playground-full-page-effect {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  min-width: 100vw !important;
  min-height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  transform: none !important;
  z-index: 1 !important;
  overflow: hidden !important;
  pointer-events: none !important;
  user-select: none !important;
  contain:
    strict;
}

.playground-full-page-effect canvas,
.playground-full-page-effect svg,
.playground-full-page-effect video,
.playground-full-page-effect img {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: cover !important;
  pointer-events: none !important;
}

.playground-polished-profile
> :not(
  .playground-full-page-effect
) {
  position: relative;
  z-index: 2;
}

/* ---------------------------------------------------------
   Discreet workspace controls
   --------------------------------------------------------- */

.playground-discreet-workspace-control {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.playground-command-center-launcher--discreet {
  right: 18px !important;
  bottom: 18px !important;
  top: auto !important;
  left: auto !important;
  z-index: 11000 !important;
  min-width: 42px;
  width: 42px;
  height: 42px;
  padding: 0 !important;
  justify-content: center;
  border-radius: 50% !important;
  opacity: 0.72;
}

.playground-command-center-launcher--discreet:hover,
.playground-command-center-launcher--discreet:focus-visible {
  opacity: 1;
}

.playground-command-center-launcher--discreet
.playground-command-center-launcher__label,
.playground-command-center-launcher--discreet
.playground-command-center-launcher__shortcut {
  display: none !important;
}

.playground-command-center-launcher--discreet
.playground-command-center-launcher__mark {
  width: 26px;
  height: 26px;
  background:
    transparent;
}

/* ---------------------------------------------------------
   Active Explorers safe zone
   --------------------------------------------------------- */

.playground-active-explorers-safe-zone {
  position: relative;
  z-index: 11001;
}

/*
  Reserve breathing room so the discreet Workspace button cannot overlap
  Active Explorers when Active Explorers is bottom-right aligned.
*/

.playground-active-explorers-safe-zone {
  margin-right:
    54px;
}

/* ---------------------------------------------------------
   Reduced motion
   --------------------------------------------------------- */

@media (
  prefers-reduced-motion:
  reduce
) {
  .playground-polished-companion,
  .playground-polished-companion-media {
    transition:
      none !important;
    animation-duration:
      1ms !important;
    animation-iteration-count:
      1 !important;
  }
}

/* ---------------------------------------------------------
   Mobile layout
   --------------------------------------------------------- */

@media (
  max-width:
  700px
) {
  .playground-profile-bio-canvas {
    min-height:
      max(
        640px,
        100dvh
      );
  }

  .playground-command-center-launcher--discreet {
    right: 12px !important;
    bottom:
      calc(
        12px +
        env(
          safe-area-inset-bottom,
          0px
        )
      ) !important;
  }

  .playground-active-explorers-safe-zone {
    margin-right:
      48px;
  }
}
EOF

# ------------------------------------------------------------
# Public exports
# ------------------------------------------------------------

cat > src/profile-experience/polish/index.ts <<'EOF'
export {
  default as ProfileExperiencePolishBridge,
} from "./ProfileExperiencePolishBridge";

export {
  createProfilePolishRuntime,
} from "./profilePolishRuntime";

export {
  ACTIVE_EXPLORERS_SELECTORS,
  BIO_CANVAS_SELECTORS,
  COMPANION_MEDIA_SELECTORS,
  COMPANION_SELECTORS,
  EFFECT_SELECTORS,
  LEGACY_WORKSPACE_LAUNCHER_SELECTORS,
  MOVABLE_OBJECT_SELECTORS,
  PROFILE_HEADER_SELECTORS,
  PROFILE_ROOT_SELECTORS,
} from "./profilePolishSelectors";
EOF

# ------------------------------------------------------------
# Mount bridge in main.tsx
# ------------------------------------------------------------

python3 <<'PY'
from pathlib import Path


def insert_import(
    source: str,
    statement: str,
    identity: str,
) -> str:
    if identity in source:
        return source

    lines = source.splitlines(
        keepends=True,
    )

    last_import_end = -1
    inside_import = False

    for index, line in enumerate(
        lines,
    ):
        stripped = line.strip()

        if not inside_import:
            if stripped.startswith(
                "import "
            ):
                inside_import = True
                last_import_end = index

                if stripped.endswith(
                    ";"
                ):
                    inside_import = False

                continue

            if (
                stripped == ""
                or stripped.startswith(
                    "//"
                )
                or stripped.startswith(
                    "/*"
                )
            ):
                continue

            break

        last_import_end = index

        if stripped.endswith(
            ";"
        ):
            inside_import = False

    insertion_index = (
        last_import_end + 1
        if last_import_end >= 0
        else 0
    )

    lines.insert(
        insertion_index,
        statement,
    )

    return "".join(lines)


path = Path(
    "src/main.tsx"
)

text = path.read_text()

text = insert_import(
    text,
    (
        'import ProfileExperiencePolishBridge '
        'from "./profile-experience/polish/ProfileExperiencePolishBridge";\n'
    ),
    'from "./profile-experience/polish/ProfileExperiencePolishBridge"',
)

if (
    "<ProfileExperiencePolishBridge />"
    not in text
):
    anchors = [
        "<ReleaseReadinessPanel />",
        "<CollaborationDiagnosticsPanel />",
        "<CollaborationCommandCenter />",
        "<ObjectInspectorPanel />",
        "<CollaborationDashboard />",
        "<VisualHistoryPanel />",
        "<SessionManager />",
        "<SessionControls />",
        "<App />",
    ]

    selected_anchor = next(
        (
            anchor
            for anchor
            in anchors
            if anchor in text
        ),
        None,
    )

    if selected_anchor is None:
        raise SystemExit(
            "❌ No suitable ProfileExperiencePolishBridge mount location was found in src/main.tsx."
        )

    text = text.replace(
        selected_anchor,
        (
            selected_anchor
            + "\n                "
            + "<ProfileExperiencePolishBridge />"
        ),
        1,
    )

path.write_text(
    text,
)

print(
    "✅ ProfileExperiencePolishBridge imported."
)

print(
    "✅ ProfileExperiencePolishBridge mounted."
)
PY

echo ""
echo "Running clean build..."
echo ""

npm run build

touch "$MARKER"

trap - EXIT

echo ""
echo "✅ Sprint $SPRINT_ID installed successfully."
echo "✅ Clean build completed."
echo ""
echo "Backup:"
echo "  $BACKUP_DIR"
echo ""
echo "Profile Experience Polish:"
echo "  • Existing Follow system preserved"
echo "  • Existing private follower counts preserved"
echo "  • Profile header removed"
echo "  • Bio expanded into primary creative canvas"
echo "  • Widgets and objects supported within bio canvas"
echo "  • Companion movement constrained to profile canvas"
echo "  • Companion backgrounds forced transparent"
echo "  • Companion blur, filters, and smudge-producing styles removed"
echo "  • GPU-safe companion compositing enabled"
echo "  • Rain and environmental effects expanded across full page"
echo "  • Effects remain click-through"
echo "  • Legacy Sessions launcher hidden"
echo "  • Legacy History launcher hidden"
echo "  • Legacy Session Controls hidden"
echo "  • Workspace launcher moved to discreet bottom-right icon"
echo "  • Active Explorers safe zone added"
echo "  • Existing keyboard shortcuts preserved"
echo ""
echo "Launch the Tauri app with:"
echo "  ./open-playground-tauri.sh"
