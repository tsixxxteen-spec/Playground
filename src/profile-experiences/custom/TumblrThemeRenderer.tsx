import { useMemo } from "react";

import type { ExperienceProps } from "../shared";
import type { TumblrThemeSettings } from "./TumblrTheme";

const EMPTY_THEME = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      min-height: 100%;
    }

    body {
      margin: 0;
      background: #0b0b0c;
      color: #f7f7f3;
      font: 16px/1.5 Arial, sans-serif;
    }

    main {
      width: min(100% - 48px, 960px);
      margin: 0 auto;
      padding: 72px 0;
    }

    .avatar {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      object-fit: cover;
    }

    h1 {
      margin: 24px 0 10px;
      font-size: clamp(48px, 10vw, 112px);
      line-height: 0.86;
      letter-spacing: -0.065em;
    }

    .username {
      opacity: 0.5;
    }

    .bio {
      max-width: 560px;
      margin-top: 24px;
      font-size: 18px;
    }

    article {
      margin-top: 60px;
      padding-top: 28px;
      border-top: 1px solid rgba(255,255,255,0.14);
    }
  </style>
</head>

<body>
  <main>
    <header>
      {block:ShowAvatar}
        <img
          class="avatar"
          src="{PortraitURL-128}"
          alt=""
        >
      {/block:ShowAvatar}

      <h1>{Title}</h1>
      <div class="username">{Username}</div>

      {block:Description}
        <p class="bio">{Description}</p>
      {/block:Description}
    </header>

    {block:Posts}
      <article>{Body}</article>
    {/block:Posts}
  </main>
</body>
</html>`;

const PLAYGROUND_THEME_REPAIR = `
<style id="playground-tumblr-theme-repair">
  html,
  body {
    min-height: 100% !important;
  }

  html {
    visibility: visible !important;
    opacity: 1 !important;
  }

  body {
    visibility: visible !important;
    opacity: 1 !important;
    overflow: auto !important;
  }

  /*
    Imported themes frequently leave one of these visible until
    their original Tumblr JavaScript finishes loading.
  */
  #preloader,
  #page-loader,
  #pageloader,
  #loading-screen,
  #loading_screen,
  #loading,
  .preloader,
  .page-loader,
  .pageLoader,
  .pageloader,
  .loading-screen,
  .loading_screen,
  .loading-overlay,
  .loader-overlay,
  .site-loader,
  .theme-loader,
  .pace,
  .pace-progress,
  [data-loader],
  [data-preloader] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  body.loading,
  body.is-loading,
  body.preloading,
  body.is-preloading {
    overflow: auto !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  img,
  video {
    max-width: 100%;
  }
</style>
`;

const PLAYGROUND_THEME_BOOT = `
<script id="playground-tumblr-theme-boot">
  (() => {
    const revealTheme = () => {
      const selectors = [
        "#preloader",
        "#page-loader",
        "#pageloader",
        "#loading-screen",
        "#loading_screen",
        "#loading",
        ".preloader",
        ".page-loader",
        ".pageLoader",
        ".pageloader",
        ".loading-screen",
        ".loading_screen",
        ".loading-overlay",
        ".loader-overlay",
        ".site-loader",
        ".theme-loader",
        ".pace",
        "[data-loader]",
        "[data-preloader]"
      ];

      document.documentElement.style.visibility = "visible";
      document.documentElement.style.opacity = "1";

      if (document.body) {
        document.body.style.visibility = "visible";
        document.body.style.opacity = "1";
        document.body.style.overflow = "auto";

        document.body.classList.remove(
          "loading",
          "is-loading",
          "preloading",
          "is-preloading"
        );
      }

      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          element.remove();
        });
      });
    };

    document.addEventListener("DOMContentLoaded", revealTheme);
    window.addEventListener("load", revealTheme);

    setTimeout(revealTheme, 250);
    setTimeout(revealTheme, 1000);
    setTimeout(revealTheme, 2500);
  })();
</script>
`;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

/*
  Scripts are intentionally retained because many real Tumblr themes
  require JavaScript to reveal and arrange the page. They execute in
  an iframe without allow-same-origin, so they cannot access
  Playground's parent document, cookies, or local storage.
*/
function removeUnsafeDocumentCapabilities(source: string): string {
  return source
    .replace(
      /<\/?(?:iframe|object|embed|base)\b[^>]*>/gi,
      "",
    )
    .replace(
      /<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi,
      "",
    )
    .replace(
      /\b(?:javascript|vbscript)\s*:/gi,
      "",
    );
}

function replaceConditionalBlock(
  source: string,
  name: string,
  keep: boolean,
): string {
  const escapedName = name.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  const pattern = new RegExp(
    `\\{block:${escapedName}\\}([\\s\\S]*?)\\{/block:${escapedName}\\}`,
    "gi",
  );

  return source.replace(pattern, keep ? "$1" : "");
}

function readMetaVariables(
  source: string,
): Record<string, string> {
  const variables: Record<string, string> = {};

  const pattern =
    /<meta\s+[^>]*name=["'](color|font|image|text|select):([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;

  for (const match of source.matchAll(pattern)) {
    const group = match[1].toLowerCase();
    const name = match[2].trim().toLowerCase();

    variables[`${group}:${name}`] = match[3];
  }

  return variables;
}

function replaceToken(
  source: string,
  token: string,
  value: string,
): string {
  const escapedToken = token.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  return source.replace(
    new RegExp(`\\{${escapedToken}\\}`, "gi"),
    value,
  );
}

function injectIntoHead(
  source: string,
  markup: string,
): string {
  if (/<\/head\s*>/i.test(source)) {
    return source.replace(
      /<\/head\s*>/i,
      `${markup}\n</head>`,
    );
  }

  return source.replace(
    /<html([^>]*)>/i,
    `<html$1><head>${markup}</head>`,
  );
}

function injectBeforeBodyEnd(
  source: string,
  markup: string,
): string {
  if (/<\/body\s*>/i.test(source)) {
    return source.replace(
      /<\/body\s*>/i,
      `${markup}\n</body>`,
    );
  }

  return `${source}\n${markup}`;
}

function buildDocument(
  props: ExperienceProps,
  settings: TumblrThemeSettings,
): string {
  const profile = props.profile;

  let source = removeUnsafeDocumentCapabilities(
    settings.html.trim() || EMPTY_THEME,
  );

  const title = escapeHtml(profile.displayName);
  const username = escapeHtml(profile.username);
  const description = escapeHtml(profile.bio).replace(
    /\n/g,
    "<br>",
  );
  const avatar = escapeHtml(profile.avatarSrc ?? "");
  const currentUrl =
    typeof window === "undefined"
      ? ""
      : escapeHtml(window.location.href);

  source = replaceConditionalBlock(
    source,
    "Description",
    Boolean(profile.bio.trim()),
  );

  source = replaceConditionalBlock(
    source,
    "ShowAvatar",
    Boolean(profile.avatarSrc),
  );

  source = replaceConditionalBlock(
    source,
    "IfShowAvatar",
    Boolean(profile.avatarSrc),
  );

  source = replaceConditionalBlock(
    source,
    "IfNotShowAvatar",
    !profile.avatarSrc,
  );

  source = replaceConditionalBlock(
    source,
    "NoPosts",
    props.postCount === 0,
  );

  source = replaceConditionalBlock(
    source,
    "HasPages",
    false,
  );

  const postMarkup =
    props.postCount > 0
      ? `
        <div class="playground-tumblr-post">
          <h2>
            ${props.postCount.toLocaleString()}
            ${props.postCount === 1 ? "published work" : "published works"}
          </h2>
          <p>Published Playground work appears on this profile.</p>
        </div>
      `
      : `
        <div class="playground-tumblr-empty">
          Your Playground is waiting.
        </div>
      `;

  source = source.replace(
    /\{block:Posts\}([\s\S]*?)\{\/block:Posts\}/gi,
    (_match, inner: string) => {
      let rendered = inner
        .replace(/\{Body\}/gi, postMarkup)
        .replace(/\{Caption\}/gi, "")
        .replace(/\{Title\}/gi, title)
        .replace(/\{PostID\}/gi, "playground-profile")
        .replace(/\{Permalink\}/gi, currentUrl);

      /*
        Themes that do not contain {Body} still receive the profile
        post placeholder instead of displaying an empty shell.
      */
      if (!rendered.includes(postMarkup)) {
        rendered = `${rendered}${postMarkup}`;
      }

      return rendered;
    },
  );

  const tokens: Record<string, string> = {
    Title: title,
    Name: title,
    Username: username,
    Description: description,
    BlogURL: currentUrl,
    URL: currentUrl,

    PortraitURL: avatar,
    "PortraitURL-16": avatar,
    "PortraitURL-24": avatar,
    "PortraitURL-30": avatar,
    "PortraitURL-40": avatar,
    "PortraitURL-48": avatar,
    "PortraitURL-64": avatar,
    "PortraitURL-96": avatar,
    "PortraitURL-128": avatar,

    PostCount: String(props.postCount),
    FollowerCount: String(props.followerCount),
    FollowingCount: String(props.followingCount),

    CopyrightYears: String(new Date().getFullYear()),
    CurrentPage: "1",
    TotalPages: "1",
    PreviousPage: currentUrl,
    NextPage: currentUrl,
    RSS: "#",
    ArchiveURL: "#",
    AskLabel: "Ask",
    SubmitLabel: "Submit",
  };

  for (const [token, value] of Object.entries(tokens)) {
    source = replaceToken(source, token, value);
  }

  for (
    const [token, value]
    of Object.entries(readMetaVariables(source))
  ) {
    source = replaceToken(source, token, value);
  }

  /*
    Unknown Tumblr blocks are kept rather than deleted. This preserves
    the internal HTML structure of sophisticated imported themes.
  */
  source = source
    .replace(/\{block:[^}]+\}/gi, "")
    .replace(/\{\/block:[^}]+\}/gi, "")
    .replace(
      /\{(?:color|font|image|text|select):[^}]+\}/gi,
      "",
    )
    .replace(
      /\{(?:lang|TimeAgo|DayOfMonth|Month|Year|ShortMonth|DayOfWeek)\}/gi,
      "",
    );

  if (!/<html[\s>]/i.test(source)) {
    source = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          >
        </head>
        <body>${source}</body>
      </html>
    `;
  }

  source = injectIntoHead(
    source,
    PLAYGROUND_THEME_REPAIR,
  );

  source = injectBeforeBodyEnd(
    source,
    PLAYGROUND_THEME_BOOT,
  );

  return source;
}

type Props = ExperienceProps & {
  settings: TumblrThemeSettings;
};

export default function TumblrThemeRenderer({
  settings,
  ...props
}: Props) {
  const srcDoc = useMemo(
    () => buildDocument(props, settings),
    [
      props.profile.displayName,
      props.profile.username,
      props.profile.bio,
      props.profile.avatarSrc,
      props.postCount,
      props.followerCount,
      props.followingCount,
      settings.html,
    ],
  );

  return (
    <iframe
      className="tumblr-theme-frame"
      title={`${props.profile.displayName} custom Tumblr theme`}
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-forms allow-modals allow-popups"
      referrerPolicy="no-referrer"
    />
  );
}
