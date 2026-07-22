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
