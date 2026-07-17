import type { ComponentType, CSSProperties } from "react";
import {
  CinemaEditorial,
  ContactSheet,
  EightBit,
  FashionEditorial,
  Graphite,
  IvoryIndex,
  MusicEditorial,
  PressKit,
  Stardust,
} from "../profile-experiences/experiences";
import type { ExperienceProps } from "../profile-experiences/shared";

export type ThemeLayout = "editorial" | "grid" | "cinematic" | "desktop" | "sidebar" | "press";
export type MusicPlacement = "inline" | "compact" | "card" | "floating" | "sidebar" | "hero";
export type EditorialCategory = "Editorial" | "Fashion" | "Music" | "Cinema" | "Portfolio" | "Archive";

export type PlaygroundTheme = {
  id: string;
  name: string;
  description: string;
  category: EditorialCategory;
  order: number;
  featured?: boolean;
  layout: ThemeLayout;
  musicPlacement: MusicPlacement;
  className: string;
  component: ComponentType<ExperienceProps>;
  colors: {
    background: string;
    surface: string;
    foreground: string;
    muted: string;
    accent: string;
    border: string;
  };
  radius: string;
  headingFont: string;
  bodyFont: string;
  contentWidth: string;
};

export const DEFAULT_THEME_ID = "ivory-index";

const editorialRegistry = [
  { id:"ivory-index", name:"Ivory Index", description:"Warm editorial whitespace and a restrained inline player.", category:"Editorial", order:10, featured:true, layout:"editorial", musicPlacement:"inline", className:"theme-ivory-index", component:IvoryIndex, colors:{background:"#f3efe6",surface:"#faf7f0",foreground:"#1e1c18",muted:"#7d756a",accent:"#9b2f25",border:"rgba(30, 28, 24, 0.18)"}, radius:"2px", headingFont:'Georgia, "Times New Roman", serif', bodyFont:'Georgia, "Times New Roman", serif', contentWidth:"980px" },
  { id:"cinema-editorial", name:"Cinema Editorial", description:"Oversized type, portrait-led storytelling, pull quotes, and film-journal pacing.", category:"Cinema", order:20, featured:true, layout:"editorial", musicPlacement:"hero", className:"theme-cinema-editorial", component:CinemaEditorial, colors:{background:"#f3f0e8",surface:"#ffffff",foreground:"#111111",muted:"#77736b",accent:"#9c241f",border:"rgba(17, 17, 17, 0.22)"}, radius:"0px", headingFont:'"Arial Narrow", "Helvetica Neue", Arial, sans-serif', bodyFont:'"Helvetica Neue", Arial, sans-serif', contentWidth:"1440px" },
  { id:"fashion-editorial", name:"Fashion Editorial", description:"Refined serif typography, asymmetrical portrait layouts, and campaign pacing.", category:"Fashion", order:30, featured:true, layout:"editorial", musicPlacement:"card", className:"theme-fashion-editorial", component:FashionEditorial, colors:{background:"#f7f5f0",surface:"#ffffff",foreground:"#111111",muted:"#76716a",accent:"#8b1f2d",border:"rgba(17, 17, 17, 0.18)"}, radius:"0px", headingFont:'Georgia, "Times New Roman", serif', bodyFont:'"Helvetica Neue", Arial, sans-serif', contentWidth:"1440px" },
  { id:"music-editorial", name:"Music Editorial", description:"A bold cover story, featured release, pull quote, visual sequence, and artist archive.", category:"Music", order:40, featured:true, layout:"editorial", musicPlacement:"hero", className:"theme-music-editorial", component:MusicEditorial, colors:{background:"#0d0d0d",surface:"#171717",foreground:"#f2efe7",muted:"#9a978f",accent:"#d9ff4b",border:"rgba(242, 239, 231, 0.18)"}, radius:"0px", headingFont:'"Helvetica Neue", Arial, sans-serif', bodyFont:'"Helvetica Neue", Arial, sans-serif', contentWidth:"1440px" },
  { id:"contact-sheet", name:"Contact Sheet", description:"A photography-first grid with a compact utility player.", category:"Portfolio", order:50, layout:"grid", musicPlacement:"compact", className:"theme-contact-sheet", component:ContactSheet, colors:{background:"#eeeeea",surface:"#ffffff",foreground:"#151515",muted:"#6f6f68",accent:"#ff4e00",border:"rgba(21, 21, 21, 0.24)"}, radius:"0px", headingFont:'"Helvetica Neue", Arial, sans-serif', bodyFont:'"Courier New", monospace', contentWidth:"1240px" },
  { id:"graphite", name:"Graphite", description:"Layered black panels with a dedicated music card.", category:"Editorial", order:60, layout:"cinematic", musicPlacement:"card", className:"theme-graphite", component:Graphite, colors:{background:"#101010",surface:"#1a1a1a",foreground:"#f1eee8",muted:"#96928b",accent:"#e6a23c",border:"rgba(255, 255, 255, 0.12)"}, radius:"18px", headingFont:'Georgia, "Times New Roman", serif', bodyFont:'"Helvetica Neue", Arial, sans-serif', contentWidth:"1120px" },
  { id:"press-kit", name:"Press Kit", description:"An artist-facing hero layout with prominent music.", category:"Music", order:70, layout:"press", musicPlacement:"hero", className:"theme-press-kit", component:PressKit, colors:{background:"#0c0c0d",surface:"#151517",foreground:"#ffffff",muted:"#a0a0a6",accent:"#fff200",border:"rgba(255, 255, 255, 0.14)"}, radius:"24px", headingFont:'"Helvetica Neue", Arial, sans-serif', bodyFont:'"Helvetica Neue", Arial, sans-serif', contentWidth:"1180px" },
  { id:"stardust", name:"Stardust", description:"A dreamy sidebar profile with music living in the rail.", category:"Archive", order:80, layout:"sidebar", musicPlacement:"sidebar", className:"theme-stardust", component:Stardust, colors:{background:"#17142a",surface:"#211d38",foreground:"#f6efff",muted:"#b8add0",accent:"#c59cff",border:"rgba(197, 156, 255, 0.35)"}, radius:"18px", headingFont:'Georgia, "Times New Roman", serif', bodyFont:'"Helvetica Neue", Arial, sans-serif', contentWidth:"1160px" },
  { id:"eight-bit", name:"Eight Bit", description:"A nostalgic windowed profile with a floating player.", category:"Archive", order:90, layout:"desktop", musicPlacement:"floating", className:"theme-eight-bit", component:EightBit, colors:{background:"#f2dce6",surface:"#fff8fc",foreground:"#493746",muted:"#8b657c",accent:"#c73f7c",border:"#9f4d78"}, radius:"14px", headingFont:'"Courier New", monospace', bodyFont:'"Courier New", monospace', contentWidth:"1040px" },
] satisfies PlaygroundTheme[];

export const playgroundThemes: PlaygroundTheme[] =
  [...editorialRegistry].sort((a, b) => a.order - b.order);

export function getTheme(themeId?: string): PlaygroundTheme {
  return playgroundThemes.find((theme) => theme.id === themeId)
    ?? playgroundThemes.find((theme) => theme.id === DEFAULT_THEME_ID)
    ?? playgroundThemes[0];
}

export type ThemeStyle = CSSProperties & Record<`--pg-${string}`, string>;
export function getThemeStyle(theme: PlaygroundTheme): ThemeStyle {
  return {
    "--pg-background": theme.colors.background,
    "--pg-surface": theme.colors.surface,
    "--pg-foreground": theme.colors.foreground,
    "--pg-muted": theme.colors.muted,
    "--pg-accent": theme.colors.accent,
    "--pg-border": theme.colors.border,
    "--pg-radius": theme.radius,
    "--pg-heading-font": theme.headingFont,
    "--pg-body-font": theme.bodyFont,
    "--pg-content-width": theme.contentWidth,
  };
}
