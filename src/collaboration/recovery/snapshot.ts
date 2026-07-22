import type {
  SharedObjectSnapshot,
} from "./types";

const OBJECT_SELECTOR =
  "[data-playground-object-id]";

function readNumber(
  value: string | undefined,
): number | undefined {
  if (
    value === undefined ||
    value.trim() === ""
  ) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function readProperties(
  element: HTMLElement,
): Record<string, unknown> {
  const raw =
    element.dataset.playgroundProperties;

  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown =
      JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<
        string,
        unknown
      >;
    }
  } catch {
    return {};
  }

  return {};
}

export function findSharedObjectElement(
  objectId: string,
): HTMLElement | null {
  const elements =
    document.querySelectorAll<HTMLElement>(
      OBJECT_SELECTOR,
    );

  for (const element of elements) {
    if (
      element.dataset
        .playgroundObjectId === objectId
    ) {
      return element;
    }
  }

  return null;
}

export function captureSharedObjectSnapshot(
  objectId: string,
): SharedObjectSnapshot {
  const element =
    findSharedObjectElement(
      objectId,
    );

  if (!element) {
    return {
      objectId,
      exists: false,
    };
  }

  const rect =
    element.getBoundingClientRect();

  const parent =
    element.parentElement;

  const siblings =
    parent
      ? Array.from(
          parent.children,
        )
      : [];

  const siblingIndex =
    siblings.indexOf(element);

  const parentObjectId =
    parent?.dataset
      .playgroundObjectId;

  return {
    objectId,
    exists: true,
    position: {
      x:
        readNumber(
          element.dataset
            .playgroundX,
        ) ?? rect.left,
      y:
        readNumber(
          element.dataset
            .playgroundY,
        ) ?? rect.top,
    },
    size: {
      width:
        readNumber(
          element.dataset
            .playgroundWidth,
        ) ?? rect.width,
      height:
        readNumber(
          element.dataset
            .playgroundHeight,
        ) ?? rect.height,
    },
    properties: {
      style:
        element.getAttribute(
          "style",
        ) ?? "",
      className:
        element.className,
      playgroundProperties:
        readProperties(element),
    },
    html:
      element.outerHTML,
    parentObjectId,
    parentSelector:
      parentObjectId
        ? undefined
        : parent === document.body
          ? "body"
          : undefined,
    siblingIndex:
      siblingIndex >= 0
        ? siblingIndex
        : undefined,
  };
}

export function captureAllSharedObjectSnapshots(): SharedObjectSnapshot[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      OBJECT_SELECTOR,
    ),
  ).flatMap((element) => {
    const objectId =
      element.dataset
        .playgroundObjectId;

    if (!objectId) {
      return [];
    }

    return [
      captureSharedObjectSnapshot(
        objectId,
      ),
    ];
  });
}

function applyStyleAttribute(
  element: HTMLElement,
  value: unknown,
) {
  if (typeof value !== "string") {
    return;
  }

  if (value.trim() === "") {
    element.removeAttribute(
      "style",
    );

    return;
  }

  element.setAttribute(
    "style",
    value,
  );
}

export function restoreSharedObjectSnapshot(
  snapshot: SharedObjectSnapshot,
) {
  const existing =
    findSharedObjectElement(
      snapshot.objectId,
    );

  if (!snapshot.exists) {
    existing?.remove();
    return;
  }

  let element = existing;

  if (
    !element &&
    snapshot.html
  ) {
    const template =
      document.createElement(
        "template",
      );

    template.innerHTML =
      snapshot.html.trim();

    const restored =
      template.content
        .firstElementChild;

    if (
      restored instanceof
      HTMLElement
    ) {
      element = restored;

      let parent:
        HTMLElement | null = null;

      if (
        snapshot.parentObjectId
      ) {
        parent =
          findSharedObjectElement(
            snapshot.parentObjectId,
          );
      }

      if (
        !parent &&
        snapshot.parentSelector
      ) {
        parent =
          document.querySelector<HTMLElement>(
            snapshot.parentSelector,
          );
      }

      if (!parent) {
        parent = document.body;
      }

      const children =
        Array.from(
          parent.children,
        );

      const reference =
        snapshot.siblingIndex !==
          undefined
          ? children[
              snapshot.siblingIndex
            ]
          : undefined;

      if (reference) {
        parent.insertBefore(
          element,
          reference,
        );
      } else {
        parent.appendChild(
          element,
        );
      }
    }
  }

  if (!element) {
    return;
  }

  if (snapshot.position) {
    element.dataset.playgroundX =
      String(
        snapshot.position.x,
      );

    element.dataset.playgroundY =
      String(
        snapshot.position.y,
      );

    const computed =
      window.getComputedStyle(
        element,
      );

    if (
      computed.position ===
        "absolute" ||
      computed.position ===
        "fixed" ||
      element.style.left !== "" ||
      element.style.top !== ""
    ) {
      element.style.left =
        `${snapshot.position.x}px`;

      element.style.top =
        `${snapshot.position.y}px`;
    }
  }

  if (snapshot.size) {
    element.dataset.playgroundWidth =
      String(
        snapshot.size.width,
      );

    element.dataset.playgroundHeight =
      String(
        snapshot.size.height,
      );

    element.style.width =
      `${snapshot.size.width}px`;

    element.style.height =
      `${snapshot.size.height}px`;
  }

  const properties =
    snapshot.properties ?? {};

  applyStyleAttribute(
    element,
    properties.style,
  );

  if (
    typeof properties.className ===
    "string"
  ) {
    element.className =
      properties.className;
  }

  const playgroundProperties =
    properties.playgroundProperties;

  if (
    playgroundProperties &&
    typeof playgroundProperties ===
      "object" &&
    !Array.isArray(
      playgroundProperties,
    )
  ) {
    element.dataset.playgroundProperties =
      JSON.stringify(
        playgroundProperties,
      );
  }
}
