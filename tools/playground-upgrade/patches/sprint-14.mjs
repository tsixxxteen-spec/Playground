export default {
  id: "sprint-14",
  description: "Install the Playground Upgrade Engine and Editorial Classic",
  projectVersion: "0.14.0",
  files: [
    "src/profile-experiences/experiences/EditorialClassic.tsx",
    "src/profile-experiences/experiences/index.ts",
    "src/profile-experiences/ExperienceRenderer.css",
    "src/themes/index.ts",
  ],
  verify: [
    {
      file: "src/themes/index.ts",
      contains: 'id: "editorial-classic"',
    },
    {
      file: "src/profile-experiences/experiences/index.ts",
      contains: 'EditorialClassic',
    },
    {
      file: "src/profile-experiences/ExperienceRenderer.css",
      contains: "EDITORIAL CLASSIC / SPRINT 14",
    },
  ],
  async apply(ctx) {
    const component = ctx.read(
      "tools/playground-upgrade/assets/EditorialClassic.tsx"
    );
    const css = ctx.read(
      "tools/playground-upgrade/assets/editorial-classic.css"
    );

    ctx.write(
      "src/profile-experiences/experiences/EditorialClassic.tsx",
      component
    );

    ctx.ensureExportLine(
      "src/profile-experiences/experiences/index.ts",
      'export { default as EditorialClassic } from "./EditorialClassic";'
    );

    ctx.ensureNamedImport(
      "src/themes/index.ts",
      "EditorialClassic",
      "../profile-experiences/experiences"
    );

    ctx.insertRegistryEntry(
      "src/themes/index.ts",
      "editorialRegistry",
      "editorial-classic",
      `  {
    id: "editorial-classic",
    name: "Editorial Classic",
    description: "A timeless magazine profile with a formal masthead, cover portrait, pull quote, listening room, and selected archive.",
    category: "Editorial",
    order: 5,
    featured: true,
    layout: "editorial",
    musicPlacement: "card",
    className: "theme-editorial-classic",
    component: EditorialClassic,
    colors: {
      background: "#eee9df",
      surface: "#f8f4ec",
      foreground: "#171512",
      muted: "#706a61",
      accent: "#8b2323",
      border: "rgba(23, 21, 18, 0.22)",
    },
    radius: "0px",
    headingFont: 'Georgia, "Times New Roman", serif',
    bodyFont: '"Helvetica Neue", Arial, sans-serif',
    contentWidth: "1440px",
  },`
    );

    ctx.appendCssBlock(
      "src/profile-experiences/ExperienceRenderer.css",
      "EDITORIAL CLASSIC / SPRINT 14",
      css
    );

    ctx.updatePackageScript(
      "playground:upgrade",
      "node tools/playground-upgrade/index.mjs"
    );
    ctx.updatePackageScript(
      "playground:status",
      "node tools/playground-upgrade/index.mjs status"
    );
  },
};
