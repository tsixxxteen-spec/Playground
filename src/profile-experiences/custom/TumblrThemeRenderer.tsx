import { useMemo } from "react";
import type { ExperienceProps } from "../shared";
import type { TumblrThemeSettings } from "./TumblrTheme";

const EMPTY_THEME = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box} body{margin:0;background:#0b0b0c;color:#f7f7f3;font:16px/1.5 Arial,sans-serif}
  main{max-width:900px;margin:0 auto;padding:72px 28px}
  header{margin-bottom:56px}.avatar{width:84px;height:84px;border-radius:50%;object-fit:cover}
  h1{font-size:clamp(42px,8vw,96px);line-height:.9;margin:20px 0 12px}.username{opacity:.55}.bio{max-width:560px}
  article{border-top:1px solid #2a2a2e;padding:28px 0}.empty{opacity:.45}
</style>
</head>
<body>
<main>
<header>
{block:ShowAvatar}<img class="avatar" src="{PortraitURL-128}" alt="">{/block:ShowAvatar}
<h1>{Title}</h1><div class="username">{Username}</div>
{block:Description}<p class="bio">{Description}</p>{/block:Description}
</header>
{block:Posts}<article>{Body}</article>{/block:Posts}
</main>
</body>
</html>`;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

function stripUnsafeMarkup(source: string): string {
  return source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\/?(?:iframe|object|embed|base)\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:javascript|vbscript)\s*:/gi, "");
}

function replaceBlock(source: string, name: string, keep: boolean): string {
  const pattern = new RegExp(`\\{block:${name}\\}([\\s\\S]*?)\\{/block:${name}\\}`, "gi");
  return source.replace(pattern, keep ? "$1" : "");
}

function readMetaVariables(source: string): Record<string, string> {
  const values: Record<string, string> = {};
  const metaPattern = /<meta\s+[^>]*name=["'](color|font|image|text|select):([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
  for (const match of source.matchAll(metaPattern)) {
    values[`${match[1]}:${match[2]}`.toLowerCase()] = match[3];
  }
  return values;
}

function buildDocument(props: ExperienceProps, settings: TumblrThemeSettings): string {
  const profile = props.profile;
  let source = stripUnsafeMarkup(settings.html.trim() || EMPTY_THEME);
  const safeTitle = escapeHtml(profile.displayName);
  const safeUsername = escapeHtml(profile.username);
  const safeBio = escapeHtml(profile.bio).replace(/\n/g, "<br>");
  const safeAvatar = escapeHtml(profile.avatarSrc ?? "");
  const safeUrl = escapeHtml(window.location.href);

  source = replaceBlock(source, "Description", Boolean(profile.bio.trim()));
  source = replaceBlock(source, "ShowAvatar", Boolean(profile.avatarSrc));
  source = replaceBlock(source, "IfShowAvatar", Boolean(profile.avatarSrc));
  source = replaceBlock(source, "IfNotShowAvatar", !profile.avatarSrc);

  const postMarkup = props.postCount > 0
    ? `<div class="playground-tumblr-post"><h2>${props.postCount.toLocaleString()} published ${props.postCount === 1 ? "work" : "works"}</h2><p>Playground post rendering will appear here.</p></div>`
    : `<div class="playground-tumblr-empty">Your Playground is waiting.</div>`;

  source = source.replace(/\{block:Posts\}([\s\S]*?)\{\/block:Posts\}/gi, (_match, inner: string) => {
    const body = inner
      .replace(/\{Body\}/gi, postMarkup)
      .replace(/\{Title\}/gi, safeTitle);
    return body.includes(postMarkup) ? body : postMarkup;
  });

  const tokens: Record<string, string> = {
    title: safeTitle,
    name: safeTitle,
    username: safeUsername,
    description: safeBio,
    blogurl: safeUrl,
    portraiturl: safeAvatar,
    "portraiturl-16": safeAvatar,
    "portraiturl-24": safeAvatar,
    "portraiturl-30": safeAvatar,
    "portraiturl-40": safeAvatar,
    "portraiturl-48": safeAvatar,
    "portraiturl-64": safeAvatar,
    "portraiturl-96": safeAvatar,
    "portraiturl-128": safeAvatar,
    postcount: String(props.postCount),
    followercount: String(props.followerCount),
    followingcount: String(props.followingCount),
  };

  for (const [token, value] of Object.entries(tokens)) {
    source = source.replace(new RegExp(`\\{${token}\\}`, "gi"), value);
  }

  for (const [token, value] of Object.entries(readMetaVariables(source))) {
    source = source.replace(new RegExp(`\\{${token.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\}`, "gi"), value);
  }

  source = source
    .replace(/\{block:[^}]+\}/gi, "")
    .replace(/\{\/block:[^}]+\}/gi, "")
    .replace(/\{(?:color|font|image|text|select):[^}]+\}/gi, "")
    .replace(/\{[A-Za-z][A-Za-z0-9_-]*\}/g, "");

  if (!/<html[\s>]/i.test(source)) {
    source = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${source}</body></html>`;
  }

  return source;
}

type Props = ExperienceProps & { settings: TumblrThemeSettings };

export default function TumblrThemeRenderer({ settings, ...props }: Props) {
  const srcDoc = useMemo(
    () => buildDocument(props, settings),
    [props.profile.displayName, props.profile.username, props.profile.bio, props.profile.avatarSrc, props.postCount, props.followerCount, props.followingCount, settings.html],
  );

  return (
    <iframe
      className="tumblr-theme-frame"
      title={`${props.profile.displayName} custom Tumblr theme`}
      srcDoc={srcDoc}
      sandbox=""
      referrerPolicy="no-referrer"
    />
  );
}
