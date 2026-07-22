import { worldInteractionRegistry } from "./WorldInteractionRegistry";

let registered = false;

export function registerBuiltinInteractions(): void {
  if (registered) return;

  worldInteractionRegistry.registerAction("open-music", ({ emit }) => {
    emit("worlds:navigate-lane", { lane: "music" });
    return { message: "Opening music", tone: "warm" };
  });
  worldInteractionRegistry.registerAction("open-photos", ({ emit }) => {
    emit("worlds:navigate-lane", { lane: "photos" });
    return { message: "Opening photos", tone: "bright" };
  });
  worldInteractionRegistry.registerAction("open-videos", ({ emit }) => {
    emit("worlds:navigate-lane", { lane: "videos" });
    return { message: "Opening videos", tone: "soft" };
  });
  worldInteractionRegistry.registerAction("open-url", ({ event }) => {
    const target = event.action.target;
    if (target) window.open(target, "_blank", "noopener,noreferrer");
    return { message: target ? "Opening link" : "No link assigned", tone: "bright" };
  });
  worldInteractionRegistry.registerAction("none", () => ({
    message: "This object is resting",
    tone: "soft",
  }));

  worldInteractionRegistry.registerObject("personal-plant", () => ({
    message: "The plant looks refreshed",
    tone: "soft",
    eventName: "worlds:object-watered",
  }));
  worldInteractionRegistry.registerObject("personal-coffee", () => ({
    message: "A warm sip",
    tone: "warm",
    eventName: "worlds:coffee-sipped",
  }));
  worldInteractionRegistry.registerObject("personal-moon-lamp", () => ({
    message: "Moon lamp toggled",
    tone: "bright",
    eventName: "worlds:lamp-toggled",
  }));
  worldInteractionRegistry.registerObject("personal-pixel-cat", () => ({
    message: "Pixel Cat is happy to see you",
    tone: "playful",
    eventName: "worlds:companion-petted",
  }));

  registered = true;
}
