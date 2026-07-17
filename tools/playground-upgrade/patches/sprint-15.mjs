export default {
  id: "sprint-15",
  description: "Add the shared Playground Editorial Design System",
  projectVersion: "0.15.0",
  requires: ["sprint-14"],
  files: [
    "src/profile-experiences/ExperienceRenderer.css",
  ],
  verify: [
    {
      file: "src/profile-experiences/ExperienceRenderer.css",
      contains: "EDITORIAL DESIGN SYSTEM / SPRINT 15",
    },
    {
      file: "src/profile-experiences/ExperienceRenderer.css",
      contains: "--ed-font-display",
    },
    {
      file: "src/profile-experiences/ExperienceRenderer.css",
      contains: ".ed-feature-grid",
    },
  ],
  async apply(ctx) {
    const css = ctx.read(
      "tools/playground-upgrade/assets/editorial-design-system.css"
    );

    ctx.appendCssBlock(
      "src/profile-experiences/ExperienceRenderer.css",
      "EDITORIAL DESIGN SYSTEM / SPRINT 15",
      css
    );
  },
};
